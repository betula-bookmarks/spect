import * as symbol from './symbols.js'
import c, { observer } from './channel.js'

const depsCache = new WeakMap

export default function v(source, map=v=>v, unmap=v=>v) {
  const channel = c(), { subscribe, observers, push } = channel

  let fn = (...args) => {
    if (!args.length) return get()
    if (observer(...args)) {
      let unsubscribe = subscribe(...args)
      // callback is registered as the last channel subscription, so send it immediately as value
      if ('current' in channel) push(get(), observers.slice(-1))
      return unsubscribe
    }
    return set(...args)
  }

  // current is mapped value (map can be heavy to call each get)
  let get = () => channel.current
  let set = v => push(channel.current = map(unmap(v)))

  // we define props on fn - must hide own props
  delete fn.length
  delete fn.name
  delete fn.arguments
  delete fn.caller
  Object.defineProperties(fn, {
    valueOf: {value: get, writable: false, enumerable: false},
    toString: {value: get, writable: false, enumerable: false},
    [Symbol.toPrimitive]: {value: get, writable: false, enumerable: false},
    [symbol.observable]: {value: () => channel, writable: false, enumerable: false},
    [symbol.dispose]: {value: channel.close, writable: false, enumerable: false}
  })

  if (arguments.length) {
    // v / observ
    if (typeof source === 'function') {
      // NOTE: we can't simply check args.length, because v(fn)(fx) is valid case for observable input
      if (observable(source)) {
        set = v => source(unmap(v))
        subscribe(null, null, source(v => push(channel.current = map(v))))
      }
      else {
        set(source())
      }
    }
    // Observable (stateless)
    else if (source && source[symbol.observable]) {
      set = () => {}
      let unsubscribe = source[symbol.observable]().subscribe({next: v => push(channel.current = map(v))})
      unsubscribe = unsubscribe.unsubscribe || unsubscribe
      subscribe(null, null, unsubscribe)
    }
    // group
    // NOTE: array/object may have symbol.observable, which redefines default deps behavior
    else if (Array.isArray(source) || object(source)) {
      let vals = new source.constructor, deps = {}, dchannel = c()

      // init observables
      for (let name in source) {
        let dep
        if (observable(source[name])) dep = deps[name] = depsCache.get(source[name]) || v(source[name])
        // redefine source property to observe it
        else {
          dep = deps[name] = v(() => vals[name] = source[name])
          let orig = Object.getOwnPropertyDescriptor(source, name)
          Object.defineProperty(source, name, {
            enumerable: true,
            get: dep,
            set: orig && orig.set ? v => (orig.set.call(source, v), dep(orig.get())) : v => dep(v)
          })
        }
        dep(val => {
          vals[name] = val
          // avoid self-recursion
          if (fn !== dep) dchannel(vals)
        })
        Object.defineProperty(fn, name, { writable: false, enumerable: true, configurable: false, value: dep})
      }
      // we can handle only static deps
      Object.seal(source)

      // any deps change triggers update
      dchannel(v => push(channel.current = map(v)))

      if (Object.keys(vals).length || !Object.keys(source).length) dchannel(vals)

      set = v => dchannel(unmap(v))
      subscribe(null, null, () => {
        depsCache.delete(source)
        dchannel.close()
        for (let name in deps) deps[name][symbol.dispose]()
      })
    }
    // input
    else if (input(source)) {
      const el = source

      const iget = el.type === 'checkbox' ? () => el.checked : () => el.value

      const iset = {
        text: value => el.value = (value == null ? '' : value),
        checkbox: value => (el.checked = value, el.value = (value ? 'on' : ''), value ? el.setAttribute('checked', '') : el.removeAttribute('checked')),
        'select-one': value => {
          [...el.options].map(el => el.removeAttribute('selected'))
          el.value = value
          if (el.selectedOptions[0]) el.selectedOptions[0].setAttribute('selected', '')
        }
      }[el.type]

      set = v => (iset(unmap(v)), push(channel.current = iget()))
      const update = e => set(iget())

      // normalize initial value
      update()

      el.addEventListener('change', update)
      el.addEventListener('input', update)
      subscribe(null, null, () => {
        el.removeEventListener('change', update)
        el.removeEventListener('input', update)
      })
    }
    // async iterator (stateful, initial undefined)
    else if (source && (source.next || source[Symbol.asyncIterator])) {
      set = () => {}
      let stop
      ;(async () => {
        for await (let v of source) {
          if (stop) break
          push(channel.current = map(v))
        }
      })()
      subscribe(null, null, () => stop = true)
    }
    // promise (stateful, initial undefined)
    else if (source && source.then) {
      set = p => (delete channel.current, p.then(v => push(channel.current = map(v))))
      set(source)
    }
    // ironjs
    else if (source && source.mutation && '_state' in source) {
      const Reactor = source.constructor
      const reaction = new Reactor(() => set(source.state))
      set(source.state)
    }
    // plain value
    else {
      set(source)
    }
  }

  // cancel subscriptions, dispose
  subscribe(null, null, () => {
    // get = set = () => {throw Error('closed')}
    get = set = () => {}
    delete channel.current
  })

  return fn
}

export function primitive(val) {
  if (typeof val === 'object') return val === null
  return typeof val !== 'function'
}

export function observable(arg) {
  if (!arg) return false
  return !!(
    arg[symbol.observable]
    || (typeof arg === 'function' && arg.set)
    || arg[Symbol.asyncIterator]
    || arg.next
    || arg.then
    || arg && arg.mutation && '_state' in arg
  )
}

export function object (value) {
	if (Object.prototype.toString.call(value) !== '[object Object]') return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
}

export function input (arg) {
  return arg && (arg.tagName === 'INPUT' || arg.tagName === 'SELECT')
}

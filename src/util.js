const Symbol = globalThis.Symbol

export const symbol = {
  dispose: Symbol ? (Symbol.dispose || (Symbol.dispose = Symbol('dispose'))) : '@@dispose',
  observable: Symbol ? (Symbol.observable || (Symbol.observable = Symbol('observable'))) : '@@observable'
}

export const channel = () => {
  const observers = []

  function push (...vals) {
      const observers = this ? this.observers || this : channel.observers
      observers.map(sub => {
          if (sub.out && sub.out.call) sub.out()
          if (sub.next) sub.out = sub.next(...vals)
      })
  }

  const error = (e) => observers.map(sub => sub.error && sub.error(e))

  const close = () => {
      let unsubs = observers.map(sub => {
          if (sub.out && sub.out.call) sub.out()
          return sub.unsubscribe
      })
      observers.length = 0
      unsubs.map(unsub => unsub())
      channel.closed = true
  }

  const subscribe = (next, error, complete) => {
      next = next && next.next || next
      error = next && next.error || error
      complete = next && next.complete || complete

      const unsubscribe = () => {
          if (observers.length) observers.splice(observers.indexOf(subscription) >>> 0, 1)
          if (complete) complete()
          unsubscribe.closed = true
      }
      unsubscribe.unsubscribe = unsubscribe
      unsubscribe.closed = false

      const subscription = { next, error, complete, unsubscribe }
      observers.push(subscription)

      return unsubscribe
  }

  const channel = (...vals) => observer(...vals) ? subscribe(...vals) : push(...vals)

  return Object.assign(channel, {
      observers,
      closed: false,
      push,
      subscribe,
      close,
      error
  })
}

// we can't handle observable subscription here - it deals with node[_ref], which is not this function concern
export function attr (el, name, value) {
  // if (arguments.length < 3) return (value = el.getAttribute(name)) === '' ? true : value

  if (!el.setAttribute) return

  if (primitive(value)) {
    if (value === false || value == null) el.removeAttribute(name)
    else el.setAttribute(name, value === true ? '' : value)
  }
  // class=[a, b, ...c] - possib observables
  else if (name === 'class' && Array.isArray(value)) {
    el.setAttribute(name, value.filter(Boolean).join(' '))
  }
  // onclick={} - just ignore
  else if (typeof value === 'function') {}
  // style={}
  else if (name === 'style' && value.constructor === Object) {
    let values = Object.values(value)
    el.setAttribute(name, Object.keys(value).map((key, i) => `${key}: ${values[i]};`).join(' '))
  }
}

export const observer = (next, error, complete) => (next && next.call) || (error && error.call) || (complete && complete.call) || (next && observer(next.next, next.error, next.complete))

export const desc = value => Object.assign({configurable: false, enumerable: false}, value === undefined ? {writable: true} : {value})

export const list = arg => Array.isArray(arg) || (!primitive(arg) && !arg.nodeType && arg[Symbol.iterator])

export const esc = n => n.replace(/"|'|\\/g, '')

// join an array with a function
export const join = (arr, fn) => {
  let str = '', i = 0
  for (; i < arr.length - 1; i++) str += arr[i] + fn(i)
  return str += arr[i]
}

// not so generic, but performant
export const primitive = (val) =>
  !val ||
  typeof val === 'string' ||
  typeof val === 'boolean' ||
  typeof val === 'number' ||
  (typeof val === 'object' ? (val instanceof RegExp || val instanceof Date) :
  typeof val !== 'function')

export const observable = (arg) =>
  arg && !!(
    arg[symbol.observable]
    || (typeof arg === 'function' && arg.set)
    || arg[Symbol.asyncIterator]
    || arg.next
    || arg.then
    // || arg.mutation && arg._state != null
  )


// fast arguments slice https://www.npmjs.com/package/sliced
export const slice = (args, slice, sliceEnd) => {
  let ret = [];
  let len = args.length;

  if (0 === len) return ret;

  let start = slice < 0 ? Math.max(0, slice + len) : slice || 0;

  if (sliceEnd !== undefined) len = sliceEnd < 0 ? sliceEnd + len : sliceEnd

  while (len-- > start) ret[len - start] = args[len];

  return ret;
}

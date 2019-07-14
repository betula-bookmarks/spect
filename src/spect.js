import { isAsync, noop } from './util.js'
import render from './render.js';


// TODO: invalidate html vdom for elements that're being changed by something outside of spect scope


// const SPECT_CLASS = '👁' //+ Math.random().toString(36).slice(2)
// const CONNECTED = 0, DISCONNECTED = 1

// NOTE: aspect === init effect, that treats returned function as destroy effect

// selector effects
export const selectors = {}

// tracked real elements with their effects
export const tracking = new WeakMap()


const SELECTOR_ID = 1, SELECTOR_CLASS = 2, SELECTOR_QUERY = 3, SELECTOR_ELEMENT = 4

function getSelectorType (selector) {
  if (selector instanceof Node) return SELECTOR_ELEMENT
  if (/^#[^\s]*$/.test(selector)) return SELECTOR_ID
  if (/^\.[^\s]*$/.test(selector)) return SELECTOR_CLASS
  return SELECTOR_QUERY
}

// TODO: run already existing elements matching selector

// { selector: listener[] } map
// FIXME: make a weakmap

export default function spect (selector, listener) {
  if (selector instanceof Node) {
    let target = selector
    return handleListener(target, null, listener)
  }

  // FIXME: make selectors an array
  let listeners = selectors[selector] || (selectors[selector] = [])
  listeners.push(listener)
  listeners.type = getSelectorType(selector)

  // TODO: create spect.min without mutation observers
  // no-mutations initializer
  handleElements(document.querySelectorAll(selector))

  // instantly handle accumulated mutations (skips extra tick)
  handleMutations(observer.takeRecords())
}


// TODO: build an listener listener?
// TODO: observer allows multiple targets
// TODO: unregister observer when element is unmounted
// FIXME: make this observer lazy
// Single purpose observer - init listener for elements matching selector
export const observer = new MutationObserver(handleMutations)

// FIXME: make observer combinatory, so that complex selectors don't register observe-all stuff. `css-what` is nice solution.
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  // FIXME: selectors should register corresponding attributeFilter
  attributeFilter: ['id', 'class']
})


function handleMutations (mutations) {
  for (let m = 0; m < mutations.length; m++) {
    const { addedNodes, removedNodes, target, type, attributeName, oldValue } = mutations[m]

    handleElements([...addedNodes, ...removedNodes, target])
  }
}

function handleElements (nodes) {
  // TODO: inverse querying as `ids[node.id]`, `classes[node.class[i]]`
  // TODO: cache selectors assigned to targets and check if they're valid still
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i]

    // ignore non-element nodes
    // FIXME: there should be a faster way to filter text nodes
    if (node.nodeType !== 1) continue

    // check if target matches any of registered selector listeners
    for (let selector in selectors) {
      let selListeners = selectors[selector]
      let selType = selListeners.type

      let targets = []

      if (selType === SELECTOR_ID) {
        let id = selector.slice(1)
        if (node.id === id) targets.push(node)
        else {
          // FIXME: use more correct root for server-side env
          const el = document.getElementById(id)
          if (node.contains(el)) targets.push(el)
        }
      }
      else if (selType === SELECTOR_QUERY) {
        if (node.matches(selector)) targets.push(node)
        targets.push(...node.querySelectorAll(selector))
      }
      else if (selType === SELECTOR_CLASS) {
        let elClass = selector.slice(1)
        if (node.classList.contains(elClass)) targets.push(node)
        targets.push(...node.getElementsByClassName(elClass))
      }

      targets = targets.filter(Boolean)

      selListeners.forEach(listener => {
        targets.forEach(target => handleListener(target, selector, listener))
      })
    }
  }
}

function handleListener(target, selector, listener) {
  // init state for unknown targets
  if (!tracking.has(target)) {
    tracking.set(target, new WeakMap)
  }

  let targetListeners = tracking.get(target)

  // init run listener
  if (!targetListeners.has(listener)) {
    let listenerState = {}
    targetListeners.set(listener, listenerState)

    // result is destructor function
    render(target, selector, listener)
  }
}


// calling fx stack
export let currentTarget = document.documentElement
export let currentFx = null
export let currentFxName = null
export let currentBeforeFxStack = [], currentAfterFxStack = []


// before render hook
export function beforeFx(fn) {
  if (currentBeforeFxStack.indexOf(fn) < 0) currentBeforeFxStack.push(fn)
}

export function callFx(name, fn, target) {
  let prevTarget
  if (target) {
    prevTarget = currentTarget
    currentTarget = target
  }

  let prevFx = currentFx
  currentFx = fn

  // TODO: use for effectFn.name
  let prevFxName = currentFxName
  currentFxName = name

  currentBeforeFxStack.forEach(fn => fn())

  // current target passed for inline effects `$(target).fx(target => {})`
  let result = fn(currentTarget)

  currentAfterFxStack.forEach(fn => fn())

  currentFx = prevFx
  currentFxName = prevFxName
  if (target) currentTarget = prevTarget

  return result
}

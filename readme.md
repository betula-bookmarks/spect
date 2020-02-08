<div align="center"><img src="https://avatars3.githubusercontent.com/u/53097200?s=200&v=4" width=108 /></div>
<p align="center"><h1 align="center">spect</h1></p>
<p align="center">
  Micro DOM <a href="https://en.wikipedia.org/wiki/Aspect-oriented_programming"><em>aspects</em></a> with <em>effects</em> and <em>observables</em>.<br/>
  <!-- Build reactive UIs with rules, similar to CSS.<br/> -->
  <!-- Each rule specifies an <em>aspect</em> function, carrying a piece of logic.<br/> -->
</p>
<p align="center">
  <img src="https://img.shields.io/badge/stability-unstable-yellowgreen"/>
  <a href="https://travis-ci.org/spectjs/spect"><img src="https://travis-ci.org/spectjs/spect.svg?branch=master"/></a>
  <a href="https://bundlephobia.com/result?p=spect"><img alt="npm bundle size" src="https://img.shields.io/bundlephobia/min/spect"></a>
  <a href="https://npmjs.org/package/spect"><img alt="npm" src="https://img.shields.io/npm/v/spect"></a>
</p>

<p align="center"><img src="/preview.png" width="679"/></p>

<!--
<script type="module">
  import { $, fx, store } from "https://unpkg.com/spect?module"
  import { html, render } from "https://unpkg.com/lit-html?module"

  const url = "https://api.hnpwa.com/v0/news"
  const news = store({
    items: [],
    loading: false,
    async load() {
      this.loading = true
      this.items = await fetch(url).then(r => r.json())
      this.loading = false
    }
  })

  $('.news-list', el => {
    news.load()
    fx(({ items, loading }) => render(
      news.loading ? html`<progress />` :
      items.map(item => html`<li>${ item.title }</li>`),
    el), [ news ])
  })
</script>
-->

## Installing

#### A. Directly as module:

```html
<script type="module">
import { $, fx } from 'https://unpkg.com/spect@latest?module'
</script>
```

#### B. As dependency from npm:

[![npm i spect](https://nodei.co/npm/spect.png?mini=true)](https://npmjs.org/package/spect/)

```js
import { $ } from 'spect'
```

_Spect_ is perfect match with [Snowpack](https://www.snowpack.dev/), but any other bundler will do.

## Usage

_Spect_ makes no guess at storage, actions, renderer or tooling setup and can be used with different flavors.

#### Vanilla

```js
import { $ } from 'spect'

// touched inputs
$('input', el => el.addEventListener('focus', e => el.classList.add('touched')))
```

#### Lit-html

```js
import { $, fx, on } from 'spect'
import { render, html } from 'lit-html'

$('input#height', el => {
  fx(e => {
    const value = e.target.value

    render(html`Your height: <strong>${ value }</strong>cm`, hintEl)
  }, [on(el, 'input'), on(el, 'change')])
})
```

<!--

#### React-less hooks

```js
import $ from 'spect'
import * as augmentor from 'augmentor'
import hooked from 'enhook'
import setHooks, { useState, useEffect } from 'unihooks'

// init hooks
enhook.use(augmentor)
setHooks(augmentor)

$('#timer', hooked(el => {
  let [count, setCount] = useState(0)
  useEffect(() => {
    let interval = setInterval(() => setCount(count => count + 1), 1000)
    return () => clearInterval(interval)
  }, [])
  el.textContent = `Seconds: ${count}`
}))
```

#### Microfrontends

Pending...

#### Aspect-Oriented DOM

Pending...

-->

## API

### _`$`_

> $( selector | element, aspect )

_**`$`**_ is selector observer effect. It assigns an `aspect` function to `selector` or `element`. The `aspect` is triggered when an element matching the `selector` is mounted, and optional returned callback is called when unmounted or asect is tore down.

* `selector` should be a valid CSS selector.
* `element` can be an _HTMLElement_ or list of elements (any array-like).
* `aspect` is a function with `target => teardown` signature, or an array of functions.

<!-- * `context` is optional element to assign mutation observer to, can be helpful for perf optimization, but benchmark shows that the effect of MO is insignificant. -->

```js
import { $ } from 'spect'

$('.timer', el => {
  let count = 0

  let id = setInterval(() => {
    el.innerHTML = `Seconds: ${count++}`
  }, 1000)

  return () => clearInterval(id)
})
```

<br/>

### _`fx`_

> fx( state => teardown, deps = [] )

_**`fx`**_ is generic effect. It reacts to changes in `deps` and runs callback, much like _useEffect_.

`deps` expect:

* _Async Generator_ / _Async Iterable_ / object with [`Symbol.asyncIterator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) method;
* _Promise_ / _Thenable_;
* _Observable_ / an object with `.subscribe` method ([rxjs](https://ghub.io/rxjs) / [any-observable](https://ghub.io/any-observable) / [zen-observable](https://ghub.io/zen-observable) etc);
* _Function_ is considered an [observable](https://ghub.io) / [observ](https://ghub.io) / [mutant](https://ghub.io/mutant);
* any other value is considered constant.

`values` reflect new `deps` state and passed as arguments. Returned `teardown` function is used as destructor, when the deps state changes.

```js
import { state, fx } from 'spect'
import { time } from 'wait-please'

let count = state(0)

fx(async c => {
  console.log('Seconds', c)
  await time(1000)
  count(c + 1)
}, [count])
```

<br/>

### _`state`_

> value = state( init? )

_**`state`**_ creates an observable value, that is simply getter/setter function with [_asyncIterator_](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) interface. `init` can be an initial value or initializer function.
_**`state`**_ plays role of _useState_ hook, or [observable](https://ghub.io/observable).

```js
import { state } from 'spect'

let count = state(0)

// get
count()

// set
count(1)
count(c => c + 1)

// observe changes
for await (let value of count) {
  // 0, 1, ...
}
```

<br/>


### _`calc`_

> value = calc( state => result, deps = [] )

Creates an observable value, computed from `deps`. Similar to _**`fx`**_, but the result is observable. _**`calc`**_ is analog of _useMemo_.

```js
import { $, input, calc } from 'spect'

const f = state(32), c = state(0)
const celsius = calc(f => (f - 32) / 1.8, [f])
const fahren = calc(c => (c * 9) / 5 + 32, [c])

celsius() // 0
fahren() // 32
```

<br/>

### _`prop`_

> value = prop( target, name )

_**`prop`**_ is target property observable, serves as accessor and streams changes. _**`prop`**_ keeps safe target's own getter/setter, if defined.

```js
import { prop, fx } from 'spect'

let o = { foo: 'bar' }

fx(foo => console.log(foo), [prop(o, 'foo')])

o.foo = 'baz'

// outputs
// "bar"
// "baz"
```

<br/>

### _`attr`_

> value = attr( element, name )

Element attribute observable. Similar to _**`prop`**_, it provides access to attribute value and streams changes.

```js
import { fx, attr } from 'spect'

fx(loading => {
  console.log(loading)
}, [attr(el, 'loading')])
```

<br/>

### _`store`_

> obj = store( init = {} )

Observable object. Unlike _**`state`**_, creates a proxy for the object − adding, changing or deleting props emits changes. Similar to _Struct_ in [mutant](https://ghub.io/mutant).

```js
import { store } from 'spect'

let likes = store({
  count: null,
  loading: false,
  load() {
    this.loading = true
    let response = await fetch(url)
    let data = await response.json()
    this.loading = false
    this.count = data.count
  }
})

$('.likes-count', el => {
  fx(async () => {
    render(likes.loading ? html`Loading...` : html`Likes: ${ likes.count }`, element)
  }, [likes])
})
```

<br/>

### _`on`_

> evts = on( element, eventName )

Stateless events async iteratable. Come handy for event-based effects. To stop observing, invoke `evts.cancel()`.

```js
import { $, on, calc, fx } from 'spect'

$('input', el => {
  // current input value
  let value = calc(e => e.target.value, [
    on(el, 'input'),
    on(el, 'change')
  ])

  // current focus state
  let focus = calc(e => e.type === 'focus', [
    on(el, 'focus'),
    on(el, 'blur')
  ])

  fx(validate, [ value, focus ])

  return () => on.cancel( )
})
```

<br/>

### _`ref`_

> value = ref( init? )

_**`ref`**_ is core value observer, serves as foundation for other observables. Unlike _**`state`**_, it does not support functional setter and emits every set value.  _**`ref`**_ is direct analog of _useRef_ hook.

```js
import { ref } from 'spect'

let count = ref(0)

// get
count()

// set
count(1)

// sets value to a function (!)
count(c => c + 1)
count() // c => c + 1

// observe changes
for await (const c of count) {
  // 1, ...
}

// discard observable, end generators
count.cancel()
```

<br/>

<!-- Best of React, jQuery and RxJS worlds in a tiny tool. -->

## Inspiration / R&D

* [selector-observer](https://ghub.io/selector-observer) − same idea with object-based API.
* [unihooks](https://ghub.io/unihooks) − cross-framework hooks collection.
* [observable](https://ghub.io/observable), [observ](https://ghub.io/observ), [mutant](https://ghub.io/mutant) − elegant observable implementation.
* [zen-observable](https://ghub.io/zen-observable), [es-observable](https://ghub.io/es-observable) et all − foundational research / proposal.
* [reuse](https://ghub.io/reuse) − aspects attempt for react world.
* [tonic](https://ghub.io/tonic), [etch](https://ghub.io/etch), [turbine](https://github.com/funkia/turbine), [hui](https://ghub.io/hui) − nice takes on web-component framework.
* [atomico](https://ghub.io/atomico), [haunted](https://ghub.io/haunted), [fuco](https://ghub.io/fuco) − react-less hooks implementations.

<p align="right">HK</p>

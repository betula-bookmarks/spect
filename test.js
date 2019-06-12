import {test as t, assert} from './node_modules/tape-modern/dist/tape-modern.esm.js'
import $, { mount } from './dom.js'
import {h} from './src/util.js'


assert.deepEqual = (a, b, msg) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      console.error('Not deepEqual', a, b)
      throw Error(msg)
    }
  }
}

// tick is required to let mutation pass
function delay (delay=0) { return new Promise((ok) => setTimeout(ok, delay))}









// --------------------- Multiaspect multitarget interaction
t('Same aspect different targets')
t('Same target different aspects')
t('Same aspect same target')



// --------------------- Building aspects



// ---------------------- Selector cases

t('selectors basics', async t => {
  let log = []
  $('#app', el => {
    log.push('render')

    mount(() => {
      log.push('on')
      return () => log.push('off')
    })
  })

  let app = h`div#app`
  t.deepEqual(log, [])

  // should detect mount
  document.body.appendChild(app)
  await delay()
  t.deepEqual(log, ['render', 'on'], 'mount')

  document.body.removeChild(app)
  await delay()
  t.deepEqual(log, ['render', 'on', 'off'], 'unmount')

})

t('already mounted selector', async t => {
  let log = []


  let a = document.createElement('div')
  a.id = 'app'
  document.body.appendChild(a)

  $('#app', el => {
    mount(() => (log.push('mount'), () => log.push('unmount')) )
    log.push('render')
  })

  // should be instant
  // await delay()

  t.deepEqual(log, ['render', 'mount'])

  document.body.appendChild(a)
  await delay()
  t.deepEqual(log, ['render', 'mount'])

  document.body.removeChild(a)
  t.deepEqual(log, ['render', 'mount'])
  await delay()
  t.deepEqual(log, ['render', 'mount', 'unmount'])
})

t('replaced nodes, instantly mounted/unmounted', async t => {
  let log = []
  $('.app', el => {
    log.push('render')
    mount(() => {
      log.push('mount')
      return () => log.push('unmount')
    })
  })

  let el = document.createElement('div')
  el.classList.add('app')
  document.body.appendChild(el)
  document.body.removeChild(el)

  await delay()
  t.deepEqual(log, ['render'])

  document.body.appendChild(el)
  await delay()
  t.deepEqual(log, ['render', 'mount'])

  let x = document.body.appendChild(document.createElement('div'))
  x.appendChild(el)
  await delay()
  t.deepEqual(log, ['render', 'mount'])
  // FIXME: this is also possible, but replace fast-on-load then
  // t.deepEqual(log, ['render', 'mount', 'unmount', 'mount'])
})

t('new aspect by appending attribute matching selector', async t => {
  let log = []
  $('.a', el => {
    log.push('render')
    mount(() => {
      log.push('mount')
      return () => log.push('unmount')
    })
  })

  let a = document.createElement('a')
  document.body.appendChild(a)
  await delay()
  t.deepEqual(log, [])

  a.classList.add('a')
  await delay()
  t.deepEqual(log, ['render', 'mount'])
})


// ------------------------------ Selector types
// selectors
t('id observer', t => {
  $('#el', () => {

  })
})

t('class observer', t => {
  $('.hm', () => {

  })
})

t('query observer', t => {
  $('a > span', () => {

  })
})

t('new element', t => {
  $('div', () => {

  })
})

t('new custom element', t => {
  $('custom-element', () => {

  })
})


// targets
t('existing element', async t => {
  // init on detached new
  let div = document.createElement('div')

  let log = []

  $(div, el => {
    t.equal(el, div, 'Element should be the target')

    log.push('render')

    // test fx
    // should be called on any update
    fx(() => {
      log.push('fx')
      return () => log.push('unfx')
    })

    // should be called on init only
    fx(() => {
      log.push('once')
      return () => {
        log.push('destroy')
      }
    }, [])

    // TODO: test mount also
  })
  t.deepEqual(log, ['render'], 'render is called instantly')
  await (()=>{})
  t.deepEqual(log, ['render', 'fx', 'once'], 'fx is called in next tick')

  /*
  // TODO
  // init on detached known

  // root-level aspect should not be rerendered, it should be initialized once
  // but nested aspects should be updated in regards to root element
  $(div, el => {
    // new aspect augments element with additional behavior
  })

  // TODO: if root-level aspect is called with the same aspect function, it is ignored
  $(div, Aspect)
  $(div, Aspect)

  // TODO: How do we handle
  $(div, function aspect1 () {
    let [a, set] = state(false)

    if (!a) $(target, subaspectA)
    // at the moment of rendering, target had subaspectA caused by aspect1
    // should that replace subaspectA, or augment target with subaspectB?
    // that is classic problem of hooks - how to identify specific hook?
    // so spect is a hook, should be at the first level to be detectable
    // in this case, it will replace A with B, but as far as the order keeps
    else $(target, subaspectB)

    setTimeout(() => set(true), 1000)
  })

  // SO: the aspect is identifyable by its invocation position in parent aspect.
  // if there's no parent aspect, it is expected to be invoked once only


  // init on attached new
  // init on attached known
  */
})

t('array of elements', t => {
  $([a, b, c], () => {

  })
})

t('mixed array', t => {
  $(['.a', b, '.c'], () => {

  })
})

// edge cases
t('null target')
t('fake target')



// handlers
t('function', t => {
  // this
  // args
  $('', () => {

  })
})

t('props', t => {
  $('', {})
})

t('children', t => {
  $('', a, b, c)
})

t('props + children', t => {
  $('', {a, b, c}, a, fn, c)
})

//component tree https://github.com/scrapjs/permanent/issues/2)
t('text', t => {
  $(target, 'abc')
})
t('Element', t => {
  $(target, Element)
})
t('vdom', t => {
  // DO via plugins
  $(target, react|vdom)
})
t('class', t => {
  class Component {
    constructor () {}
    mount () {}
    update () {}
    unmount () {}
    render () {} // optional
    draw () {} // optional
    destroy () {}
  }
  $(target, Component)
})
t('fake gl layers', t => {
  html`<canvas is=${GlCanvas}>
    <canvas-layer>${ gl => {} }<//>
    <canvas-layer>${ gl => {} }<//>
  </canvas>`
})
t('`is` property', t => {
  // TODO: test `is` to be possibly any aspect, an array etc
  $('div', {is: () => {

  }}, ...children)
})
t('promise (suspense)', t => {
  $('div', import('url'))
})

// props
// apply to target
// apply to selector
// CRUD
// updating causes change


// nested variants
t('el > el', t => {
  $('a', a,
    $('b')
  )
})

t('el > selector > el', t => {
  $('a',
    $('#b',
      $('c')
    )
  )
})

t('selector > selector', t => {
  $('#',
    $('#', () => {})
  )
})

t('selector > els > selector', t => {
  $('.', {},
    $([a, b, c],
      $('.', () => {})
    )
  )
})


// hooks
t('')
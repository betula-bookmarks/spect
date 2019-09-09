import t from 'tst'
import spect, { current } from '..'

t.skip('counter', t => {
  let $n = spect({
    x: 1, [Symbol.toStringTag]() {
      return 'Validator';
    }})

  $n.use(({state}) => {
    state({count: 0}, [])

    console.log(state('count'))

    setTimeout(() => {
      state(s => ++s.count)
    }, 1000)
  })
})

t('core: empty / primitive selectors', t => {
  let $x = spect()
  let $x1 = spect()
  t.is($x !== $x1, true)

  $x.state('x', 1)
  t.is($x.state('x'), 1)

  let $y = spect('xyz')
  let $y1 = spect('xyz')
  t.is($y !== $y1, true)

  $y.state('y', 1)
  t.is($y.state('y'), 1)

  let $z = spect(null)
  let $z1 = spect(null)
  t.is($z !== $z1, true)

  $z.state('y', 1)
  t.is($z.state('y'), 1)
})

t.todo('registering effects', t => {

})

t('use: aspects must be called in order', async t => {
  let log = []
  let a = {}
  await spect(a).use(() => log.push(1), () => log.push(2), () => log.push(3))
  t.deepEqual(log, [1, 2, 3])
})

t('use: duplicates are ignored', async t => {
  let log = []

  await spect({}).use(fn, fn, fn)

  function fn() {
    log.push(1)
  }

  t.is(log, [1])

  await spect({}).use(fn, fn, fn)

  t.is(log, [1, 1])
})

t('use: aspects must not be called multiple times, unless target state changes', async t => {
  let log = []

  let $a = spect({})
  await $a.use(fn)
  t.is(log, ['x'])
  await $a.use(fn)
  t.is(log, ['x'])
  await $a.use(fn, fn)
  t.is(log, ['x'])
  await $a.run()
  t.is(log, ['x', 'x'])

  function fn(el) { log.push('x') }
})

t.skip('use: same aspect different targets', t => {
  let log = []
  function fx([el]) {
    log.push(el.tagName)
    // return () => log.push('destroy ' + el.tagName)
  }

  let $el = spect({tagName: 'A'}).use(fx)

  t.is($el.target.tagName, log[0])
  t.is(log, ['A'])

  $el.target.innerHTML = '<span></span>'
  $($el.target.firstChild).use(fx)

  t.deepEqual(log, ['A', 'SPAN'])
})

t('use: Same target different aspects', async t => {
  let log = []

  let a = {}

  let afx, bfx
  await spect(a).use(afx = () => (log.push('a'), () => log.push('de a')))
  t.deepEqual(log, ['a'])
  await spect(a).use(bfx = () => (log.push('b'), () => log.push('de b')))
  t.deepEqual(log, ['a', 'b'])
})

t('use: same aspect same target', async t => {
  let log = []
  let a = {}

  let fx = () => (log.push('a'), () => log.push('z'))
  await spect(a).use(fx)
  t.deepEqual(log, ['a'])
  await spect(a).use(fx)
  t.deepEqual(log, ['a'])
  await spect(a).use(fx)
  t.deepEqual(log, ['a'])
})

t('use: subaspects init themselves independent of parent aspects', async t => {
  let log = []

  let a = {b:{c:{}}}
  let b = a.b
  let c = b.c

  await spect(a).use(el => {
    log.push('a')
    spect(b).use(el => {
      log.push('b')
      spect(c).use(el => {
        log.push('c')
        // return () => log.push('-c')
      })
      // return () => log.push('-b')
    })
    // return () => log.push('-a')
  })

  t.deepEqual(log, ['a', 'b', 'c'])

  // $.destroy(a)

  // t.deepEqual(log, ['a', 'b', 'c', '-c', '-b', '-a'])
})

t.todo('use: generators aspects')

t('use: async aspects', t => {
  let a = spect({})

  a.use(async function a() {
    t.is(a, current.fn)
    await Promise.resolve().then()
    t.is(a, current.fn)
  })

})

t.skip('use: promise', async t => {
  let to = new Promise(ok => setTimeout(ok, 100))

  to.then()

  spect({}).use(to)
})


t('fx: global effect is triggered after current callstack', async t => {
  let log = []
  spect({}).fx(() => log.push('a'))

  t.is(log, [])

  await 0

  t.is(log, ['a'])
})

t('fx: runs destructor', async t => {
  let log = []
  let $a = spect({})

  let id = 0
  let fn = () => {
    // called each time
    $a.fx(() => {
      log.push('init 1')
      return () => log.push('destroy 1')
    })

    // called once
    $a.fx(() => {
      log.push('init 2')
      return () => log.push('destroy 2')
    }, [])

    // called any time deps change
    $a.fx(() => {
      log.push('init 3')
      return () => log.push('destroy 3')
    }, [id])
  }

  $a.use(fn)
  await Promise.resolve().then()
  t.is(log, ['init 1', 'init 2', 'init 3'])

  log = []
  $a.run()
  await Promise.resolve().then()
  t.is(log, ['destroy 1', 'init 1'])

  log = [], id = 1
  $a.run()
  await Promise.resolve().then()
  t.is(log, ['destroy 1', 'destroy 3', 'init 1', 'init 3'])
})

t('fx: toggle deps', async t => {
  let log = []
  let $a = spect()

  $a.use(() => {
    $a.fx(() => {
      log.push('on')
      return () => log.push('off')
    }, !!$a.prop('on'))
  })

  t.is(log, [])
  await Promise.resolve().then()

  $a.prop('on', false)
  await Promise.resolve().then()
  t.is(log, [])

  $a.prop('on', true)
  await Promise.resolve().then()
  t.is(log, ['on'])

  $a.prop('on', true)
  await Promise.resolve().then()
  t.is(log, ['on'])

  $a.prop('on', false)
  await Promise.resolve().then()
  t.is(log, ['on', 'off'])

  $a.prop('on', false)
  await Promise.resolve().then()
  t.is(log, ['on', 'off'])

  $a.prop('on', true)
  await Promise.resolve().then()
  t.is(log, ['on', 'off', 'on'])

  $a.prop('on', true)
  await Promise.resolve().then()
  t.is(log, ['on', 'off', 'on'])

  $a.prop('on', false)
  await Promise.resolve().then()
  t.is(log, ['on', 'off', 'on', 'off'])
})

t('fx: async fx', async t => {
  let log = []

  let el = spect()
  await el.use(el => {
    el.fx(async () => {
      await null
      log.push('foo')
      return () => {
        log.push('unfoo')
      }
    })
  })

  t.is(log, ['foo'])

  await el.run()
  t.is(log, ['foo', 'unfoo', 'foo'])
})

t.todo('fx: generator fx')

t.todo('fx: promise')

t.todo('fx: varying number of effects')

t.todo('fx: remove all effects on aspect removal')

t('state: direct get/set', t => {
  spect().use(el => {
    el.state('c', 1)

    t.is(el.state('c'), 1)
  })
})

t('state: object set', t => {
  spect().use(el => {
    el.state({ c: 1, d: 2 })

    t.is(el.state('c'), 1)
  })
})

t('state: functional get/set', t => {
  let a = spect()

  a.state(s => s.count = 0)

  t.is(a.state(), { count: 0 })

  a.state(s => s.count++)
  t.is(a.state`count`, 1)
})

t('state: init gate', async t => {
  let log = [], x = 1
  let $a = spect()

  await $a.use(fn)

  t.is($a.state`x`, 1)

  x++
  $a.run()
  t.is($a.state`x`, 1)

  function fn($a) {
    $a.state({ x }, [])
  }
})

t('state: reducer', t => {
  let $a = spect({})

  $a.state({ x: 1 })

  let log = []
  $a.state(s => {
    log.push(s.x)
  })

  t.is(log, [1])
})

t.todo('state: get/set path', t => {
  let $a = spect()

  t.is($a.state('x.y.z'), undefined)

  $a.state('x.y.z', 1)
  t.is($a.state(), { x: { y: { z: 1 } } })
  t.is($a.state('x.y.z'), 1)
})

t('state: reading state registers any-change listener', async t => {
  let log = []
  let $a = spect()

  await $a.use($el => {
    let s = $el.state()

    log.push(s.x)
  })
  t.is(log, [undefined])

  await $a.state({ x: 1 })

  t.is(log, [undefined, 1])
})

t('state: recursion on both reading/setting state', async t => {
  let log = []
  await spect().use($el => {
    log.push($el.state('x'))
    $el.state({ x: 1 })
  })

  t.is(log, [undefined, 1])
})

t('state: same-effect different paths dont trigger update', async t => {
  let log = []
  await spect().use($el => {
    log.push($el.state('x'))
    $el.state('x')
    $el.state({y: 1})
  })
  t.is(log, [undefined])
})

t.todo('awaiting doesn\'t cause recursion', t => {

})

t.only('state: reading state from async stack doesnt register listener', async t => {
  let log = []
  let $a = await spect()/*.use($el => {
    log.push(1)
    // setTimeout(() => {
    //   $el.state('x')
    // })
  })
  $a.state('x', 1)
*/
  console.log($a)
  t.is(log, [1])
})

t.todo('state: reading external component state from asynchronous tick', t => {
  $a.fx($a => {
    // NOTE: reading state is limited to the same scope as fx
    // reading from another scope doesn't register listener
    // FIXME: should we ever register external state listeners?
    // we can trigger direct element rerendering, and trigger external updates via fx desp
    // that will get us rid of that problem, that isn't going to be very smart
    setTimeout(() => {
      $b.state.x
    })
  })

  $b.state.x = 1
})


t.todo('state: multiple selectors state', t => {
  let $ab = $([a, b])
  let $a = $($ab[0])

  $ab.state.x = 1
  $a.state.x = 2

  // state is bound per-element
  // but setting state broadcasts it to all elements in the selector

  $ab.state.x //jquery returns $a.state.x
})

t.todo('state: safe access to props')

t.todo('state: deps cases')

t.todo('state: nested props access')



t.todo('state: destructuring', async t => {
  let log = []
  $(document.createElement('div'), el => {
    // init/get state
    let { foo = 1, bar } = state()

    log.push('get foo,bar', foo, bar)

    // set registered listener updates element
    state({ foo: 'a', bar: 'b' })

    log.push('set foo,bar')
  })

  t.deepEqual(log, ['get foo,bar', 1, undefined, 'set foo,bar', 'get foo,bar', 'a', 'b', 'set foo,bar'])
})

t.todo('state: direct state', t => {
  let log = []
  $(document.createElement('div'), el => {
    let s = state()

    log.push('get foo,bar', s.foo, s.bar)

    Object.assign(s, { foo: 'a', bar: 'b' })

    log.push('set foo,bar')
  })

  t.deepEqual(log, ['get foo,bar', undefined, undefined, 'set foo,bar', 'get foo,bar', 'a', 'b', 'set foo,bar'])
})

t.todo('state: not shared between aspects', t => {
  let log = [], el = document.createElement('div')

  $(el, el => {
    log.push('a')
    state({ foo: 'bar' })
  })

  $(el, el => {
    let { foo } = state()
    log.push('b', foo)
  })

  t.deepEqual(log, ['a', 'a', 'b', undefined])
})

t.todo('state: render from another tick from another scope', t => {
  let log = [],
    el = document.createElement('div'),
    el2 = document.createElement('div')


  function aspect(el) {
    log.push(state().x)

    $(el2, el2 => { });

    (
      () => {
        $(el2, el2 => { });
        setTimeout(() => {
          $(el2, el2 => { });

          (() => state({ x: 1 }))()
        })
      }
    )()
  }

  $(el, aspect)

  t.deepEqual(log, [undefined])

  setTimeout(() => {
    t.deepEqual(log, [undefined, 1])
  }, 10)
})

t('prop: direct get/set', t => {
  $`<div.a/>`.use(el => {
    let $el = $(el)

    $el.prop('c', 1)
    t.is($el.prop`c`, 1)
  })
})

t('prop: object set', t => {
  $`<div.a/>`.use(el => {
    let $el = $(el)

    $el.prop({ c: 1, d: 2 })

    t.is($el.prop`c`, 1)
  })
})

t('prop: functional get/set', t => {
  let $a = $`<a/>`

  $a.prop(s => s.count = 0)

  t.is($a.prop(), $a[0])

  $a.prop(s => {
    s.count++
  })
  t.is($a.prop`count`, 1)
})

t.skip('prop: counter', t => {
  let stop = 0
  let $els = $`<div.a/>`.use(a => {
    let $a = $(a)
    $a.init(() => {
      $a.prop({ count: 0 })
    })

    console.log($a.prop`count`)
    $a.fx(s => {
      if (stop < 6) {
        setTimeout(() => {
          $a.prop(s => s.count++)
          stop++
        }, 1000)
      }
    }, [$a.prop`count`])
  })
})

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = readFileSync('src/hooks/use-screen-wake-lock.ts', 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

class Lock extends EventTarget {
  released = false
  releases = 0
  async release() {
    this.releases++
    this.drop()
  }
  drop() {
    this.released = true
    this.dispatchEvent(new Event('release'))
  }
}

function setup({ active = true, supported = true, request } = {}) {
  const document = new EventTarget()
  document.visibilityState = 'visible'
  const window = new EventTarget()
  const locks = []
  let calls = 0
  let cleanup
  const exports = {}
  vm.runInNewContext(compiled, {
    exports, document, window,
    navigator: supported ? { wakeLock: { request(type) {
      assert.equal(type, 'screen')
      calls++
      if (request) return request()
      const lock = new Lock()
      locks.push(lock)
      return Promise.resolve(lock)
    } } } : {},
    require(name) {
      assert.equal(name, 'react')
      return { useEffect(effect) { cleanup = effect() } }
    },
  })
  exports.useScreenWakeLock({ active })
  return {
    document, window, locks,
    get calls() { return calls },
    cleanup() { cleanup?.() },
    visibility(value) {
      document.visibilityState = value
      document.dispatchEvent(new Event('visibilitychange'))
    },
    foreground(event = 'focus') { window.dispatchEvent(new Event(event)) },
  }
}
const settle = () => new Promise(resolve => setImmediate(resolve))

test('only acquires during active Cook Mode on a supported browser', async () => {
  assert.equal(setup({ active: false }).calls, 0)
  assert.equal(setup({ supported: false }).calls, 0)
  const app = setup()
  await settle()
  assert.equal(app.calls, 1)
  app.cleanup()
  assert.equal(app.locks[0].releases, 1)
})

test('reacquires after browser releases lock while app is backgrounded', async () => {
  const app = setup()
  await settle()
  app.visibility('hidden')
  app.locks[0].drop()
  assert.equal(app.calls, 1)
  app.visibility('visible')
  await settle()
  assert.equal(app.calls, 2)
  assert.equal(app.locks[1].released, false)
  app.cleanup()
})

test('checks released state even before release event arrives', async () => {
  const app = setup()
  await settle()
  app.locks[0].released = true
  app.foreground('pageshow')
  await settle()
  assert.equal(app.calls, 2)
  app.cleanup()
})

test('foreground events do not duplicate held or pending locks', async () => {
  const app = setup()
  app.foreground()
  app.foreground('pageshow')
  app.visibility('visible')
  assert.equal(app.calls, 1)
  await settle()
  app.foreground()
  assert.equal(app.calls, 1)
  app.cleanup()
})

test('late request is released if Cook Mode exits before it resolves', async () => {
  let resolve
  const app = setup({ request: () => new Promise(done => { resolve = done }) })
  app.cleanup()
  const lock = new Lock()
  resolve(lock)
  await settle()
  assert.equal(lock.releases, 1)
  app.foreground()
  app.visibility('visible')
  assert.equal(app.calls, 1)
})

test('late request is released if page becomes hidden', async () => {
  let resolve
  const app = setup({ request: () => new Promise(done => { resolve = done }) })
  app.visibility('hidden')
  const lock = new Lock()
  resolve(lock)
  await settle()
  assert.equal(lock.releases, 1)
  app.visibility('visible')
  assert.equal(app.calls, 2)
  app.cleanup()
  resolve(new Lock())
  await settle()
})

test('refusal does not spin; next foreground event can retry', async () => {
  let refused = true
  const lock = new Lock()
  const app = setup({ request: () => refused ? Promise.reject(new Error('low battery')) : Promise.resolve(lock) })
  await settle()
  assert.equal(app.calls, 1)
  refused = false
  app.foreground()
  await settle()
  assert.equal(app.calls, 2)
  lock.drop()
  await settle()
  assert.equal(app.calls, 2)
  app.foreground()
  await settle()
  assert.equal(app.calls, 3)
  app.cleanup()
})

test('cleanup tolerates a rejected release promise', async () => {
  const lock = new Lock()
  lock.release = () => Promise.reject(new Error('already gone'))
  const app = setup({ request: () => Promise.resolve(lock) })
  await settle()
  app.cleanup()
  await settle()
})

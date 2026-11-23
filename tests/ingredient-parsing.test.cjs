const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(path, modules = {}) {
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, {
    module, exports: module.exports, console: { warn() {}, log() {} },
    require: (name) => {
      if (name in modules) return modules[name]
      throw new Error(`unexpected require ${name}`)
    },
  })
  return module.exports
}

const terms = load('src/lib/ingredient-terms.ts')
const { parseImportedIngredients, isUnparsedIngredient } = load('src/lib/ingredient-parsing.ts', { '@/lib/ingredient-terms': terms })

// Shapes match what Mealie's /recipes/create/url and /parser/ingredients return.
const scraped = (note) => ({ quantity: 0, unit: null, food: null, note, display: note, referenceId: note })

function fakeApi({ parsed, units = [], foods = [], parseFails = false, createFoodFails = false } = {}) {
  const calls = { parse: [], createdUnits: [], createdFoods: [] }
  let nextId = 1
  return {
    calls,
    async parseIngredients(lines) {
      calls.parse.push(lines)
      if (parseFails) throw new Error('500')
      return parsed(lines)
    },
    async getIngredientUnits(search) { return { items: units.filter((u) => u.name.includes(search.toLowerCase())) } },
    async createIngredientUnit({ name }) { calls.createdUnits.push(name); return { id: `u${nextId++}`, name } },
    async getIngredientFoods(search) { return { items: foods.filter((f) => f.name.includes(search.toLowerCase())) } },
    async createIngredientFood({ name }) {
      if (createFoodFails) throw new Error('400')
      calls.createdFoods.push(name)
      return { id: `f${nextId++}`, name }
    },
  }
}

test('scraped ingredients get quantity, unit and food from the parser', async () => {
  const api = fakeApi({
    units: [{ id: 'cup', name: 'cup' }],
    parsed: () => [
      { input: '2 cups flour', ingredient: { quantity: 2, unit: { name: 'cups' }, food: { name: 'flour' }, note: '' } },
      { input: '1 egg, beaten', ingredient: { quantity: 1, unit: null, food: { id: 'egg', name: 'egg' }, note: 'beaten' } },
    ],
  })
  const result = await parseImportedIngredients(api, [scraped('2 cups flour'), scraped('1 egg, beaten')])

  assert.deepEqual(api.calls.parse, [['2 cups flour', '1 egg, beaten']])
  assert.equal(result[0].quantity, 2)
  assert.deepEqual(result[0].unit, { id: 'cup', name: 'cup' }) // "cups" matched the existing "cup"
  assert.equal(result[0].food.name, 'flour')
  assert.ok(result[0].food.id)
  assert.equal(result[0].note, null)
  assert.equal(result[0].originalText, '2 cups flour')
  assert.equal(result[0].referenceId, '2 cups flour')
  assert.equal(result[1].quantity, 1)
  assert.deepEqual(result[1].food, { id: 'egg', name: 'egg' })
  assert.equal(result[1].note, 'beaten')
  assert.deepEqual(api.calls.createdUnits, [])
  assert.deepEqual(api.calls.createdFoods, ['flour'])
})

test('already-parsed ingredients are left alone and the parser is not called', async () => {
  const api = fakeApi({ parsed: () => { throw new Error('should not parse') } })
  const parsed = { quantity: 1, unit: null, food: { id: 'f', name: 'salt' }, note: '' }
  assert.equal(isUnparsedIngredient(parsed), false)
  assert.equal(await parseImportedIngredients(api, [parsed]), null)
  assert.deepEqual(api.calls.parse, [])
})

test('only unparsed lines are sent, and results land back in their slots', async () => {
  const api = fakeApi({ parsed: () => [{ ingredient: { quantity: 3, food: { name: 'apples' } } }] })
  const done = { quantity: 1, food: { id: 'f', name: 'salt' }, note: '' }
  const result = await parseImportedIngredients(api, [done, scraped('3 apples')])
  assert.deepEqual(api.calls.parse, [['3 apples']])
  assert.equal(result[0], done)
  assert.equal(result[1].quantity, 3)
})

test('a parser failure keeps the imported text', async () => {
  const api = fakeApi({ parseFails: true })
  assert.equal(await parseImportedIngredients(api, [scraped('2 cups flour')]), null)
})

test('a line whose food cannot be saved keeps its text while the others are parsed', async () => {
  const api = fakeApi({
    createFoodFails: true,
    foods: [{ id: 'sugar', name: 'sugar' }],
    parsed: () => [
      { ingredient: { quantity: 2, food: { name: 'mystery' } } },
      { ingredient: { quantity: 1, food: { name: 'sugar' } } },
    ],
  })
  const result = await parseImportedIngredients(api, [scraped('2 mystery'), scraped('1 sugar')])
  assert.deepEqual(result[0], scraped('2 mystery'))
  assert.equal(result[1].quantity, 1)
  assert.deepEqual(result[1].food, { id: 'sugar', name: 'sugar' })
})

test('lines the parser finds nothing in (headings, "salt to taste") keep their text', async () => {
  const api = fakeApi({ parsed: () => [{ ingredient: { quantity: 0, unit: null, food: null, note: 'For the sauce' } }] })
  assert.equal(await parseImportedIngredients(api, [scraped('For the sauce')]), null)
})

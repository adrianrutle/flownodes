import Fuse from 'fuse.js'

import _b5BlocksObject from '../../b5.js/src/blocks/blocksObjectWrapper.js'
import _b from '../editor/b5ObjectWrapper.js'

const options = {
  keys: [
    {
      name: 'name',
      weight: 0.3,
    },
    {
      name: 'description',
      weight: 0.2,
    },
    {
      name: 'text',
      weight: 0.4,
    },
    {
      name: 'type',
      weight: 0.1,
    },
  ],
  threshold: 0.4,
}

class _b5Fuse {
  constructor(b5Blocks, options) {
    this.b5Blocks = b5Blocks
    this.fuse = new Fuse([], options)

    this.originalBase = this._constructArray(this.b5Blocks.original, 'original')
    this.base = []
  }
}

_b5Fuse.prototype.update = function (source) {
  // Reconstruct Fuse search database
  delete this.base
  this.base = []
  this._constructOriginal(this.base, this.originalBase, source)

  if (source === 'playground')
    this._constructBase(this.base, this.b5Blocks.custom, 'custom', source)

  this._constructBase(this.base, this.b5Blocks.library, 'library', source)
  this.fuse.setCollection(this.base)
}

_b5Fuse.prototype.search = function (value) {
  return this.fuse.search(value)
}

_b5Fuse.prototype._constructOriginal = function (base, original, s) {
  if (s === 'playground')
    original.forEach(element => {
      if (this._filterForPlayground(element)) base.push(element)
    })
  else if (s === 'function')
    original.forEach(element => {
      if (this._filterForFunction(element)) base.push(element)
    })
  else if (s === 'variable')
    original.forEach(element => {
      if (this._filterForVariable(element)) base.push(element)
    })
}

_b5Fuse.prototype._constructArray = function (obj, src) {
  return Object.keys(obj).reduce((result, key) => {
    if (typeof obj[key] === 'object' && key !== 'library') {
      result.push({
        name: key,
        source: src,
        description: obj[key].description,
        text: obj[key].text,
        type: obj[key].type,
        filter: obj[key].filter,
      })
    }
    return result
  }, [])
}

_b5Fuse.prototype._constructBase = function (
  base,
  addon,
  src,
  targetCodeCanvas
) {
  Object.keys(addon).reduce((result, key) => {
    if (
      typeof addon[key] === 'object' &&
      this._filter(targetCodeCanvas, addon[key], key)
    ) {
      base.push({
        name: key,
        source: src,
        description: addon[key].description,
        text: addon[key].text,
        type: addon[key].type,
        filter: addon[key].filter,
      })
    }
    return result
  }, [])
}

_b5Fuse.prototype._filter = function (target, element, name) {
  name = name || element.name

  // No filter
  if (!element.filter) return true

  // setup
  if (element.filter.includes('setup') && target !== 'variable') return false
  // draw
  if (element.filter.includes('draw') && target !== 'playground') return false
  // unique
  if (element.filter.includes('unique') && _b.getAllBlockNames().includes(name))
    return false
  return true
}

_b5Fuse.prototype._filterForPlayground = function (element) {
  return this._filter('playground', element)
}

_b5Fuse.prototype._filterForFunction = function (element) {
  return this._filter('function', element)
}

_b5Fuse.prototype._filterForVariable = function (element) {
  return this._filter('variable', element)
}

const _b5Search = new _b5Fuse(_b5BlocksObject, options)

export default _b5Search

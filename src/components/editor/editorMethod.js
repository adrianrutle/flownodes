import equal from 'react-fast-compare'
import { Blob } from 'blob-polyfill'
import { saveAs } from 'file-saver'

// codeCanvas methods

export const searchBlock = (that, data, source, index) => {
  const { search } = that
  search.source = source
  search.index = index
  search.y = data[0]
  search.x = data[1]
  that.setState({ searching: true })
}

// setEditor methods

export const addBlock = (data, newBlock, thisBlocks) => {
  const [, y, x] = data

  if (!thisBlocks[y]) thisBlocks[y] = {}
  if (!thisBlocks[y][x]) thisBlocks[y][x] = newBlock
}

export const addConnection = (data, thisBlocks) => {
  // data - output to input
  const [[outY, outX], outputNodeInd, [inY, inX], inputNodeInd] = data

  // Add to outputBlock
  thisBlocks[outY][outX].output[outputNodeInd].push([inY, inX, inputNodeInd])

  // Add to inputBlock
  // Remove old connection first (if needed)
  if (thisBlocks[inY][inX].input[inputNodeInd] !== null)
    removeConnection([inY, inX, inputNodeInd], thisBlocks)

  return (thisBlocks[inY][inX].input[inputNodeInd] = [
    outY,
    outX,
    outputNodeInd,
  ])
}

export const removeConnection = (data, thisBlocks) => {
  const [inY, inX, inputNodeInd] = data
  // Remove from this input
  const [outY, outX, outNodeInd] = thisBlocks[inY][inX].input[inputNodeInd]
  thisBlocks[inY][inX].input[inputNodeInd] = null
  // Remove from parent's output
  for (let i in thisBlocks[outY][outX].output[outNodeInd])
    if (equal(thisBlocks[outY][outX].output[outNodeInd][i], data))
      thisBlocks[outY][outX].output[outNodeInd].splice(i, 1)
}

export const relocateBlock = (data, thisBlocks) => {
  const [x1, y1, x2, y2] = data

  if (!thisBlocks[y2]) thisBlocks[y2] = {}
  thisBlocks[y2][x2] = JSON.parse(JSON.stringify(thisBlocks[y1][x1]))
  delete thisBlocks[y1][x1]
  if (Object.keys(thisBlocks[y1]).length === 0) delete thisBlocks[y1]

  // Remap outputs' inputs, and inputs' outputs
  if (thisBlocks[y2][x2].output)
    // i = "0", "1"...
    for (let i in thisBlocks[y2][x2].output)
      for (let j in thisBlocks[y2][x2].output[i]) {
        // output: { '0': [['1', '0', '0'], ['1', '0', '1']] }
        const thisOutput = thisBlocks[y2][x2].output[i][j]
        const childBlock = thisBlocks[thisOutput[0]][thisOutput[1]]
        childBlock.input[thisOutput[2]] = [y2, x2, i]
      }

  if (thisBlocks[y2][x2].input)
    for (let i in thisBlocks[y2][x2].input)
      if (thisBlocks[y2][x2].input[i] !== null) {
        const thisInput = thisBlocks[y2][x2].input[i]
        const parentBlock = thisBlocks[thisInput[0]][thisInput[1]]
        for (let j in parentBlock.output[thisInput[2]]) {
          const thisOutput = parentBlock.output[thisInput[2]][j]
          if (
            thisOutput[0] === y1 &&
            thisOutput[1] === x1 &&
            thisOutput[2] === i
          ) {
            parentBlock.output[thisInput[2]][j] = [y2, x2, i]
            break
          }
        }
      }
}

export const deleteBlock = (data, thisBlocks) => {
  const [y, x] = data
  let returner = []

  // Delete input blocks' outputs
  if (thisBlocks[y][x].input) {
    const ins = thisBlocks[y][x].input
    for (let i in ins)
      if (ins[i] !== null) {
        const thisParentOutput =
          thisBlocks[ins[i][0]][ins[i][1]].output[ins[i][2]]
        for (let j in thisParentOutput)
          if (equal(thisParentOutput[j], [y, x, i]))
            thisParentOutput.splice(j, 1)
      }
  }
  // Delete output blocks' inputs
  if (thisBlocks[y][x].output)
    for (let i in thisBlocks[y][x].output)
      if (thisBlocks[y][x].output[i].length !== 0) {
        const thisOutput = thisBlocks[y][x].output[i]
        returner.push(...thisOutput)

        for (let j of thisOutput) thisBlocks[j[0]][j[1]].input[j[2]] = null
      }
  // Delete the block
  delete thisBlocks[y][x]
  if (Object.keys(thisBlocks[y]).length === 0) delete thisBlocks[y]

  return returner
}

export const inlineDataChange = (data, thisBlocks) => {
  // data - x, y, position, value
  const [x, y, ind, value] = data
  thisBlocks[y][x].inlineData[ind] = value
}

export function getFormattedTime() {
  let today = new Date()
  let tS = today.toString().split(' ')
  return tS[1] + ' ' + tS[2] + '-' + tS[4].replace(':', '-').replace(':', '-')
}

// ! SAVE
export function _saveEditor(editor, v) {
  const e = Object.assign({}, editor)
  e.version = v
  let b = new Blob([JSON.stringify(e)], {
    type: 'application/json',
  })
  saveAs(b, getFormattedTime() + '.b5.json')
}

/* --------------------------------- Helpers -------------------------------- */

export const getSectionNames = factoryType => {
  // factoryType - array of objects
  const names = []
  for (let f of factoryType) names.push(f.name)
  return names
}

/**
 * Parse the version string got from package.json
 * If beta set to true, '0.2.1' will become '0.2.1+ beta'
 */
export const parseVersion = (versionString, beta) => {
  return beta ? (
    <>
      {versionString}
      <span className="sup-text">+ beta</span>
    </>
  ) : (
    versionString
  )
}

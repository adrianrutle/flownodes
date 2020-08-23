import React, { useRef, useEffect, useState } from 'react'

import { drag, usePrevious, IconList } from '../main'
import {
  lineNumberWidth,
  blockAlphabetHeight,
  factoryCanvasDefaultScale,
  sectionHeightDefault,
} from '../constants'
import Playground from '../playground/playground'
import Factory from '../factory/factory'
import '../../postcss/components/editor/editor.css'

import Logo from '../../img/logo/logo-original.svg'

const Editor = ({ bridge }) => {
  /* Editor data */
  const [editor, setEditor] = useState({
    playground: {
      type: 'playground',
      lineStyles: {},
      blocks: {
        '0': {
          '0': {
            name: 'numberSlider',
            inlineData: [200, 0, 600, 10],
            output: {
              '0': [[1, 1, 0]],
            },
          },
        },
        '1': {
          '1': {
            name: 'ellipse',
            input: {
              '0': [0, 0, 0],
              '1': null,
              '2': null,
              '3': null,
            },
          },
        },
      },
    },
    factory: {
      variable: [
        // 0 (The whole section canvas)
        {
          /* --- data --- */
          name: 'cnv' /* For the section/constructed block */,
          removable: false /* Can we delete the section? */,
          type: 'variable' /* What is the type of the customized block? */,
          lineStyles: {} /* lineStyles */,
          blocks: {
            /* blocks */
            '0': {
              /* Line number - start from 0 */
              '0': {
                /* Column number - start from 0 */
                name: 'number',
                inlineData: [500],
                output: { '0': [[1, 0, 0]] }, // For block rendering
              },
              '1': {
                name: 'numberSlider',
                inlineData: [300, 0, 1000, 100],
                output: { '0': [[1, 0, 1]] }, // One output node may be connected to multiple input nodes
              },
            },
            '1': {
              '0': {
                name: 'createCanvas',
                input: {
                  '0': [0, 0, 0], // Line number, column number, index of the node
                  '1': [0, 1, 0],
                },
                output: {
                  '0': [],
                },
              },
              '1': {
                name: 'background',
                input: {
                  '0': null,
                  '1': null,
                  '2': null,
                  '3': null,
                },
              },
            },
          },
        },
        // 1...
      ],
      function: [],
      object: [],
    },
  })

  /* canvasStyle is stored separately in Editor (for update efficiency) */
  const [editorCanvasStyle, setEditorCanvasStyle] = useState({
    playground: {
      left: lineNumberWidth,
      top: blockAlphabetHeight,
      scale: 1,
    },
    factory: {
      variable: [
        /* --- canvasStyle --- */
        {
          left: lineNumberWidth,
          top: blockAlphabetHeight,
          scale: factoryCanvasDefaultScale,
          sectionHeight: sectionHeightDefault,
        },
      ],
      function: [],
      object: [],
    },
  })

  const leftElement = useRef(),
    rightElement = useRef(),
    separator = useRef()

  // Editor updated
  const [sentEditor, setSentEditor] = useState(false) // Ever sent to Viewer?
  const prevEditor = usePrevious(editor) // Previous editor state
  useEffect(() => {
    if (editor !== prevEditor || !sentEditor) {
      setSentEditor(true)
      bridge(editor)
    }
  }, [editor, prevEditor, sentEditor, bridge])

  // Editor style (of some codeCanvas) updated
  useEffect(() => {
    // Store the styles to localStorage
  }, [editorCanvasStyle])

  // Init draggable center divider
  useEffect(() => {
    drag('separator', separator, leftElement, rightElement)
  }, [separator])

  /*

  > editor
  {
    playground: {
      // name: 'playground',
      // removable: false,
      type: 'playground',
      lineStyle: {},
      blocks: {},
    },
    factory: {
      variable: [],
      function: [],
      object: [],
    },
  }

  */

  // ** setEditor **
  const collectEditorData = (data, task, source, index = 0) => {
    // Combine data from all sources: playground, variable, function, object
    setEditor(prevState => {
      let newState = JSON.parse(JSON.stringify(prevState))
      let thisBlocks
      if (source === 'playground') thisBlocks = newState.playground.blocks
      else thisBlocks = newState.factory[source][index].blocks

      switch (task) {
        case 'relocateBlock':
          relocateBlock(data[0], data[1], data[2], data[3], thisBlocks)
          break
        case 'inlineDataChange':
          inlineDataChange(data, thisBlocks)
          break

        default:
          break
      }

      return newState
    })
  }
  const relocateBlock = (x1, y1, x2, y2, thisBlocks) => {
    if (!thisBlocks[y2]) thisBlocks[y2] = {}
    thisBlocks[y2][x2] = JSON.parse(JSON.stringify(thisBlocks[y1][x1]))
    delete thisBlocks[y1][x1]
    if (Object.keys(thisBlocks[y1]).length === 0) delete thisBlocks[y1]

    // Remap outputs' inputs, and inputs' outputs
    if (thisBlocks[y2][x2].output)
      // i = "0", "1"...
      for (let i in thisBlocks[y2][x2].output)
        if (thisBlocks[y2][x2].output[i].length !== 0)
          for (let j in thisBlocks[y2][x2].output[i]) {
            // output: { '0': [[1, 0, 0], [1, 0, 1]] }
            const thisOutput = thisBlocks[y2][x2].output[i][j]
            const childBlock = thisBlocks[thisOutput[0]][thisOutput[1]]
            childBlock.input[thisOutput[2]] = [y2, x2, parseInt(i)]
          }
    if (thisBlocks[y2][x2].input)
      for (let i in thisBlocks[y2][x2].input)
        if (thisBlocks[y2][x2].input[i] !== null) {
          const thisInput = thisBlocks[y2][x2].input[i]
          const parentBlock = thisBlocks[thisInput[0]][thisInput[1]]
          for (let j in parentBlock.output[thisInput[2]]) {
            const thisOutput = parentBlock.output[thisInput[2]][j]
            if (thisOutput[0] === Number(y1) && thisOutput[1] === Number(x1))
              parentBlock.output[thisInput[2]][j] = [y2, x2, parseInt(i)]
          }
        }
  }

  const inlineDataChange = (data, thisBlocks) => {
    // data - x, y, position, value
    const [x, y, ind, value] = data
    thisBlocks[y][x].inlineData[ind] = value
  }

  // ** setEditorCanvasStyle **
  const collectEditorCanvasStyle = (data, source, index = 0) => {
    setEditorCanvasStyle(prevState => {
      let newState = JSON.parse(JSON.stringify(prevState))
      if (source === 'playground') newState[source] = data
      else newState.factory[source][index] = data

      return newState
    })
  }

  const addSection = type => {
    const toAdd = JSON.parse(nativeSectionDataToAdd), // Data
      toAddStyle = JSON.parse(nativeSectionStyleToAdd) // Style

    toAdd.type = type

    setEditor(prevState => {
      let newState = JSON.parse(JSON.stringify(prevState)) // Deep copy
      newState.factory[type].push(toAdd)
      return newState
    })

    setEditorCanvasStyle(prevState => {
      let newState = JSON.parse(JSON.stringify(prevState))
      newState.factory[type].push(toAddStyle)
      return newState
    })
  }

  return (
    <div id="editor">
      <div className="header">
        <IconList
          iconsName={['Settings', 'File', 'Share']}
          onClickFunc={[null, null, null]}
        />
        <a
          href="https://github.com/peilingjiang/b5"
          rel="noopener noreferrer"
          target="_blank"
        >
          <img id="logo" src={Logo} alt="b5" />
        </a>
      </div>

      <div className="split">
        <div ref={leftElement} id="editor-left">
          <div id="factory">
            {/* Variables Functions Objects */}
            <Factory
              data={editor.factory}
              canvasStyle={editorCanvasStyle.factory}
              addSection={addSection}
              collect={collectEditorData}
              collectStyle={collectEditorCanvasStyle}
            />
            {/* <div className="shadow"></div> */}
          </div>
        </div>

        {/* Separator here */}
        <div ref={separator} className="separator"></div>

        <div ref={rightElement} id="editor-right">
          <Playground
            data={editor.playground}
            canvasStyle={editorCanvasStyle.playground}
            collect={collectEditorData}
            collectStyle={collectEditorCanvasStyle}
          />
        </div>
      </div>
    </div>
  )
}

// A section template to add to each tab
const nativeSectionData = {
    name: '',
    removable: true,
    type: '' /* Modify before adding... */,
    /*
  type should always be 'variable', 'function', and 'object'
  (w/out 's'!) in the data object and passed along the functions
  */
    lineStyles: {},
    blocks: {},
  },
  nativeSectionStyle = {
    left: lineNumberWidth,
    top: blockAlphabetHeight,
    scale: factoryCanvasDefaultScale,
    sectionHeight: sectionHeightDefault,
  }
const nativeSectionDataToAdd = JSON.stringify(nativeSectionData),
  nativeSectionStyleToAdd = JSON.stringify(nativeSectionStyle)

export default Editor

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND } from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@lexical/list';
import { Button, Tooltip, ButtonGroup } from 'flowbite-react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  HiBold,
  HiItalic,
  HiOutlineLink,
  HiOutlineListBullet,
  HiOutlineNumberedList,
  HiQuestionMarkCircle,
} from 'react-icons/hi2';
import { MdFormatUnderlined, MdFormatAlignLeft, MdFormatAlignCenter, MdFormatAlignRight } from 'react-icons/md';

type ViewMode = 'scroll' | 'pages';

interface ToolbarPluginProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onInsertCitation?: () => void;
}

export default function ToolbarPlugin({
  viewMode,
  onViewModeChange,
  onInsertCitation,
}: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (level: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(level));
      }
    });
  };

  const formatList = (listType: 'bullet' | 'number') => {
    if (listType === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const formatAlignment = (align: 'left' | 'center' | 'right') => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
  };

  return (
    <div className="lexical-toolbar">
      <ButtonGroup>
        <Tooltip content="Жирный (Ctrl+B)">
          <Button
            size="sm"
            color={isBold ? 'blue' : 'gray'}
            onClick={() => formatText('bold')}
          >
            <HiBold className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Курсив (Ctrl+I)">
          <Button
            size="sm"
            color={isItalic ? 'blue' : 'gray'}
            onClick={() => formatText('italic')}
          >
            <HiItalic className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Подчеркнутый (Ctrl+U)">
          <Button
            size="sm"
            color={isUnderline ? 'blue' : 'gray'}
            onClick={() => formatText('underline')}
          >
            <MdFormatUnderlined className="h-4 w-4" />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <div className="toolbar-divider" />

      <ButtonGroup>
        <Tooltip content="Заголовок 1">
          <Button size="sm" color="gray" onClick={() => formatHeading('h1')}>
            H1
          </Button>
        </Tooltip>

        <Tooltip content="Заголовок 2">
          <Button size="sm" color="gray" onClick={() => formatHeading('h2')}>
            H2
          </Button>
        </Tooltip>

        <Tooltip content="Заголовок 3">
          <Button size="sm" color="gray" onClick={() => formatHeading('h3')}>
            H3
          </Button>
        </Tooltip>
      </ButtonGroup>

      <div className="toolbar-divider" />

      <ButtonGroup>
        <Tooltip content="Маркированный список">
          <Button size="sm" color="gray" onClick={() => formatList('bullet')}>
            <HiOutlineListBullet className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Нумерованный список">
          <Button size="sm" color="gray" onClick={() => formatList('number')}>
            <HiOutlineNumberedList className="h-4 w-4" />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <div className="toolbar-divider" />

      <ButtonGroup>
        <Tooltip content="Выровнять слева">
          <Button size="sm" color="gray" onClick={() => formatAlignment('left')}>
            <MdFormatAlignLeft className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Выровнять по центру">
          <Button size="sm" color="gray" onClick={() => formatAlignment('center')}>
            <MdFormatAlignCenter className="h-4 w-4" />
          </Button>
        </Tooltip>

        <Tooltip content="Выровнять справа">
          <Button size="sm" color="gray" onClick={() => formatAlignment('right')}>
            <MdFormatAlignRight className="h-4 w-4" />
          </Button>
        </Tooltip>
      </ButtonGroup>

      <div className="toolbar-divider" />

      {onInsertCitation && (
        <Tooltip content="Вставить цитату">
          <Button size="sm" color="purple" onClick={onInsertCitation}>
            <HiQuestionMarkCircle className="h-4 w-4 mr-1" />
            Цитата
          </Button>
        </Tooltip>
      )}

      <div className="ml-auto flex gap-2">
        <ButtonGroup>
          <Button
            size="sm"
            color={viewMode === 'scroll' ? 'blue' : 'gray'}
            onClick={() => onViewModeChange('scroll')}
          >
            📜 Лента
          </Button>
          <Button
            size="sm"
            color={viewMode === 'pages' ? 'blue' : 'gray'}
            onClick={() => onViewModeChange('pages')}
          >
            📄 Страницы
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  Alignment,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  Paragraph,
  RemoveFormat,
  Strikethrough,
  Table,
  TableToolbar,
  Underline,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

const editorConfig = {
  licenseKey: 'GPL' as const,
  plugins: [
    Alignment,
    BlockQuote,
    Bold,
    Essentials,
    Heading,
    Indent,
    IndentBlock,
    Italic,
    Link,
    List,
    Paragraph,
    RemoveFormat,
    Strikethrough,
    Table,
    TableToolbar,
    Underline,
  ],
  toolbar: [
    'undo',
    'redo',
    '|',
    'heading',
    '|',
    'bold',
    'italic',
    'underline',
    'strikethrough',
    'link',
    'blockQuote',
    'removeFormat',
    '|',
    'alignment',
    '|',
    'bulletedList',
    'numberedList',
    'outdent',
    'indent',
    '|',
    'insertTable',
  ],
  table: {
    contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'],
  },
  heading: {
    options: [
      { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
      { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
      { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
    ],
  },
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
};

export function CmsRichTextEditor({ value, onChange, minHeight = '220px' }: Props) {
  return (
    <div
      className="cms-editor border rounded-md overflow-hidden [&_.ck-editor__editable]:min-h-[var(--cms-editor-min-h)]"
      style={{ '--cms-editor-min-h': minHeight } as React.CSSProperties}
    >
      <CKEditor
        editor={ClassicEditor}
        config={editorConfig}
        data={value}
        onChange={(_event, editor) => onChange(editor.getData())}
      />
    </div>
  );
}

/** Alias for product/blog forms. */
export const RichTextEditor = CmsRichTextEditor;

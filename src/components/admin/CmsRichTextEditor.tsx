import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  Italic,
  Link,
  List,
  Paragraph,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

const editorConfig = {
  licenseKey: 'GPL' as const,
  plugins: [Bold, Essentials, Italic, Link, List, Paragraph, Heading],
  toolbar: [
    'undo',
    'redo',
    '|',
    'heading',
    '|',
    'bold',
    'italic',
    'link',
    '|',
    'bulletedList',
    'numberedList',
  ],
};

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function CmsRichTextEditor({ value, onChange }: Props) {
  return (
    <div className="cms-editor border rounded-md overflow-hidden [&_.ck-editor__editable]:min-h-[220px]">
      <CKEditor
        editor={ClassicEditor}
        config={editorConfig}
        data={value}
        onChange={(_event, editor) => onChange(editor.getData())}
      />
    </div>
  );
}

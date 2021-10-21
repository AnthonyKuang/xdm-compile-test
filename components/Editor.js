import React, { useState, useMemo, memo, useCallback } from 'react';
import { useDebounceFn } from 'ahooks';
import * as runtime from 'react/jsx-runtime.js';
import { VFile } from 'vfile';
import { VFileMessage } from 'vfile-message';
import { evaluate } from 'xdm';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import CodeMirror from 'rodemirror';
import { basicSetup } from '@codemirror/basic-setup';
import { markdown as langMarkdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { ErrorBoundary } from 'react-error-boundary';

function useMdx(defaults) {
  const [state, setState] = useState({ ...defaults, file: null });
  const { run: setConfig } = useDebounceFn(
    async (config) => {
      const file = new VFile({ basename: 'example.mdx', value: config.value });

      try {
        file.result = (
          await evaluate(file, {
            ...runtime,
            useDynamicImport: true,
            remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMath],
          })
        ).default;
      } catch (error) {
        const message =
          error instanceof VFileMessage ? error : new VFileMessage(error);

        if (!file.messages.includes(message)) {
          file.messages.push(message);
        }

        message.fatal = true;
      }

      setState({ ...config, file });
    },
    { leading: true, trailing: true, wait: 500 }
  );

  return [state, setConfig];
}

const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div role="alert">
    <p>Something went wrong:</p>
    <pre>{error.message}</pre>
    <button type="button" onClick={resetErrorBoundary}>
      Try again
    </button>
  </div>
);

// eslint-disable-next-line react/display-name
const MemoizedCodeMirror = memo((props) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <CodeMirror {...props} />
  </ErrorBoundary>
));

const FallbackComponent = ({ error }) => {
  const message = new VFileMessage(error);
  message.fatal = true;
  return (
    <pre>
      <code>{String(message)}</code>
    </pre>
  );
};

export default function Editor({ children }) {
  const defaultValue = children;
  const extensions = useMemo(() => [basicSetup, oneDark, langMarkdown()], []);
  const [state, setConfig] = useMdx({
    gfm: false,
    frontmatter: false,
    math: false,
    value: defaultValue,
  });
  const onUpdate = useCallback(
    (v) => {
      if (v.docChanged) {
        setConfig({ ...state, value: String(v.state.doc) });
      }
    },
    [state, setConfig]
  );

  return (
    <div>
      <div>
        <MemoizedCodeMirror
          value={state.value}
          extensions={extensions}
          onUpdate={onUpdate}
        />
      </div>

      <div>
        <noscript>Enable JavaScript for the rendered result.</noscript>
        <div>
          {state.file && state.file.result ? (
            <ErrorBoundary FallbackComponent={FallbackComponent}>
              {state.file.result()}
            </ErrorBoundary>
          ) : null}
        </div>
      </div>
    </div>
  );
}

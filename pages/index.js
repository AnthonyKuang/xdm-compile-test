import Editor from '../components/Editor';

export default function Home() {
  return (
    <Editor>
      {`Hello, world!
Below is an example of markdown in JSX.

<div style={{padding: '1rem', backgroundColor: 'violet'}}>
  Try and change the background color to \`tomato\`.
</div>`}
    </Editor>
  );
}

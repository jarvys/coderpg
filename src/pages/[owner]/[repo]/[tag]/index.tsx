import qs from "query-string";
import { useEffect, useMemo, useState, useRef } from "react";
import { Tree } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { useRouter } from "next/router";
import Editor from "@monaco-editor/react";

import { mapRangeToLinesDecoration } from "@/helper";

interface RepoContext {
  owner: string;
  repo: string;
  tag: string;
}

interface ActiveFile {
  url: string;
  path: string;
}

const languageMap: [RegExp, string][] = [
  [/ts|tsx/, "typescript"],
  [/js|jsx/, "javascript"],
  [/sass|css|less/, "css"],
  [/go/, "go"],
  [/py/, "python"],
  [/rs/, "rust"],
  [/json/, "json"],
];

function useDestroryFlagRef() {
  const ref = useRef(false);

  useEffect(() => {
    ref.current = false;
    return () => {
      ref.current = true;
    };
  }, []);

  return ref;
}

function View({ ctx }: { ctx: RepoContext }) {
  const destroyRef = useDestroryFlagRef();
  const promiseRef = useRef<Promise<any>>();
  const editorRef = useRef<any>();
  const [tree, setTree] = useState<any>(null);
  const [activeFile, setActiveFile] = useState<ActiveFile>();
  const activeFileRef = useRef<ActiveFile>();
  const decorationIdxRef = useRef([]);

  async function updateEditorValueIfNeed() {
    if (editorRef.current && activeFileRef.current) {
      const { url } = activeFileRef.current;
      const blobURL = `/api/v1.repo.readfile?${qs.stringify({ url })}`;
      let res = await fetch(blobURL).then((r) => r.json());
      if (url !== activeFileRef.current?.url) {
        return;
      }
      editorRef.current?.setValue(res?.data || "");

      res = await fetch(`/api/v1.file.getmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ctx,
          path: activeFileRef.current.path,
        }),
      }).then((r) => r.json());
      if (url !== activeFileRef.current?.url) {
        return;
      }
      const decorations = mapRangeToLinesDecoration(res.data || []);
      const oldDecorationIds = decorationIdxRef.current.slice();
      decorationIdxRef.current = editorRef.current.deltaDecorations(
        oldDecorationIds,
        decorations
      );
    }
  }

  const language = useMemo(() => {
    if (activeFile?.path) {
      const path = activeFile.path;
      const ext: string = path.slice(path.lastIndexOf(".") + 1);
      return languageMap.find(([pattern]) => pattern.test(ext))?.[1];
    } else {
      return undefined;
    }
  }, [activeFile]);

  useEffect(() => {
    if (!promiseRef.current) {
      promiseRef.current = fetch(
        `/api/v1.repo.getfiles?${qs.stringify(ctx)}`
      ).then((r) => r.json());
    }

    promiseRef.current.then((res) => {
      const files = res?.data || [];
      const root: any = { children: [] };
      files
        .filter((f: any) => f.type === "tree")
        .forEach((f: any) => {
          const dirs = f.path.split("/");
          let parent = root;
          dirs.forEach((d: string) => {
            let node = parent.children?.find((c: any) => c.name === d);
            if (!node) {
              node = {
                title: d,
                key: f.path,
                name: d,
                children: [],
                isLeaf: false,
                selectable: false,
              };
              if (!parent.children) {
                parent.children = [];
              }
              parent.children.push(node);
            }
            parent = node;
          });
        });
      files
        .filter((f: any) => f.type === "blob")
        .forEach((f: any) => {
          const paths = f.path.split("/");
          const filename = paths[paths.length - 1];
          const dirs = paths.slice(0, paths.length - 1);
          const node = {
            title: filename,
            isLeaf: true,
            key: f.path,
            originFile: f,
          };
          let parent = root;
          for (let i = 0; i < dirs.length; i++) {
            const dir = dirs[i];
            let dirNode = parent.children?.find(
              (child: any) => child.name === dir
            );
            if (!dirNode) {
              break;
            }
            parent = dirNode;
          }
          if (parent) {
            if (!parent.children) {
              parent.children = [];
            }
            parent.children.push(node);
          }
        });
      setTree(root);

      const file = files.find((f: any) => /^README/i.test(f.path));
      if (file) {
        const activeFile = { url: file.url, path: file.path };
        setActiveFile(activeFile);
        activeFileRef.current = activeFile;
      }
    });
  }, []);

  useEffect(() => {
    updateEditorValueIfNeed();
  }, [activeFile]);

  async function handleMark(editor: any, type: "got" | "not-got") {
    const path = activeFileRef.current?.path;
    if (!path) {
      return;
    }
    const selection = editor.getSelection();
    if (!selection) {
      return null;
    }
    const res = await fetch("/api/v1.file.mark", {
      method: "POST",
      headers: { "Content-Type": "applicaton/json" },
      body: JSON.stringify({
        ...ctx,
        path,
        type,
        start: selection.startLineNumber,
        end: selection.endLineNumber,
      }),
    }).then((r) => r.json());
    if (path === activeFileRef.current?.path && !destroyRef.current) {
      const decorations = mapRangeToLinesDecoration(res.data || []);
      const oldDecorationIds = decorationIdxRef.current.slice();
      decorationIdxRef.current = editorRef.current.deltaDecorations(
        oldDecorationIds,
        decorations
      );
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Tree
        style={{ width: 240, height: "100%", overflow: "auto", padding: 8 }}
        treeData={tree?.children || []}
        showLine
        switcherIcon={<DownOutlined />}
        onSelect={(_, info) => {
          if (info.selectedNodes.length > 0) {
            const node = info.selectedNodes[0] as any;
            const file = {
              url: node.originFile.url as string,
              path: node.originFile.path as string,
            };
            activeFileRef.current = file;
            setActiveFile(file);
          }
        }}
      />
      <div
        style={{
          flex: 1,
          height: "100%",
          overflowY: "auto",
          borderLeft: "1px solid #ebebeb",
        }}
      >
        <div
          style={{
            height: 32,
            lineHeight: "32px",
            fontSize: 14,
            paddingLeft: 8,
            color: "rgba(0, 0, 0, .48)",
          }}
        >
          {activeFile?.path || ""}
        </div>
        <div style={{ height: "calc(100vh - 32px)" }}>
          <Editor
            height="100%"
            language={language}
            defaultValue=""
            onMount={(editor) => {
              editorRef.current = editor;
              editorRef.current.addAction({
                contextMenuGroupId: "coderpg",
                id: "mark-as-got",
                label: "coderpg: Got it",
                run: (editor: any) => handleMark(editor, "got"),
              });
              editorRef.current.addAction({
                contextMenuGroupId: "coderpg",
                id: "mark-as-not-got",
                label: "coderpg: Not yet",
                run: (editor: any) => handleMark(editor, "not-got"),
              });
              updateEditorValueIfNeed();
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ViewWrap() {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const { owner, repo, tag } = router.query;

  const ctx = useMemo(() => {
    return {
      owner: owner as string,
      repo: repo as string,
      tag: tag as string,
    };
  }, [owner, repo, tag]);

  useEffect(() => setVersion((v) => v + 1), [ctx]);

  if (!ctx.owner || !ctx.repo || !ctx.tag) {
    return <></>;
  }

  return <View key={version} ctx={ctx} />;
}

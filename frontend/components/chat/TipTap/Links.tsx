import { Globe } from "lucide-react";
import { Link } from "@tiptap/extension-link";
import { Node, nodePasteRule } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
const CustomLinks = Node.create({
  name: "keeno-link",
  addNodeView() {
    return ReactNodeViewRenderer((props) => {
      const { node } = props;
      return (
        <NodeViewWrapper as="span">
          {" "}
          <span
            className="inline-flex align-middle max-w-40 flex-row overflow-hidden text-ellipsis items-center pr-2.5 gap-1.5 px-1.5 py-1 rounded-full bg-neutral-200 dark:bg-neutral-700 transition-all cursor-pointer text-sm font-medium [&>span]:w-36 self-center [&>span]:text-nowrap [&>span]:overflow-hidden [&>span]:text-ellipsis"
            data-atomic-link="true"
            title={node.attrs.href}
          >
            <Globe size={16} /> <span>{node.attrs.href}</span>{" "}
          </span>
        </NodeViewWrapper>
      );
    });
  },
  addPasteRules() {
    const urlRegex = /https?:\/\/[^\s]+/gi;
    return [
      nodePasteRule({
        find: urlRegex,
        type: this.type,
        getAttributes: (match) => ({ href: match[0] }),
      }),
    ];
  },
});
export default CustomLinks;

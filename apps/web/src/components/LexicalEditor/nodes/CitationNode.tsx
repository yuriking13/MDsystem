import { DecoratorNode, LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import type { EditorConfig, NodeKey } from 'lexical';
import React from 'react';

export type SerializedCitationNode = Spread<
  {
    citationId: string;
    citationNumber: number;
    note?: string;
  },
  SerializedLexicalNode
>;

export class CitationNode extends DecoratorNode<JSX.Element> {
  __citationId: string;
  __citationNumber: number;
  __note?: string;

  static getType(): string {
    return 'citation';
  }

  static clone(node: CitationNode): CitationNode {
    return new CitationNode(
      node.__citationId,
      node.__citationNumber,
      node.__note,
      node.__key
    );
  }

  constructor(
    citationId: string,
    citationNumber: number,
    note?: string,
    key?: NodeKey
  ) {
    super(key);
    this.__citationId = citationId;
    this.__citationNumber = citationNumber;
    this.__note = note;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.className = 'citation-marker';
    return span;
  }

  updateDOM(): false {
    return false;
  }

  exportJSON(): SerializedCitationNode {
    return {
      citationId: this.__citationId,
      citationNumber: this.__citationNumber,
      note: this.__note,
      type: 'citation',
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedCitationNode): CitationNode {
    return $createCitationNode(
      serializedNode.citationId,
      serializedNode.citationNumber,
      serializedNode.note
    );
  }

  decorate(): JSX.Element {
    return (
      <span className="citation-inline" title={this.__note}>
        [{this.__citationNumber}]
      </span>
    );
  }
}

export function $createCitationNode(
  citationId: string,
  citationNumber: number,
  note?: string
): CitationNode {
  return new CitationNode(citationId, citationNumber, note);
}

export function $isCitationNode(
  node: LexicalNode | null | undefined
): node is CitationNode {
  return node instanceof CitationNode;
}

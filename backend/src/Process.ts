import { PDFParse } from "pdf-parse";

export async function PDFtoTXT(file: Bun.BunFile): Promise<string> {
    const buffer = await file.arrayBuffer();
    const Parser = new PDFParse({ data:buffer });
    return (await Parser.getText()).text;
}
// Every selector is scoped; this stylesheet is also used in the print window.
export const PUESTO_DOCUMENT_CSS = `
.puesto-document{font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;letter-spacing:0;color:#172033;background:#fff;overflow-wrap:anywhere;padding:36px 40px;min-width:0}
.puesto-document *{box-sizing:border-box}
.puesto-document .puesto-header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #2563eb;padding-bottom:20px;margin-bottom:24px}
.puesto-document .puesto-header strong{font-size:15px;font-weight:700}
.puesto-document .puesto-header p{font-size:11px;color:#64748b;margin:3px 0 0}
.puesto-document .puesto-logo{width:100px;max-height:55px;object-fit:contain}
.puesto-document .puesto-code{margin-left:auto;text-align:right;font-size:11px;color:#64748b;flex-shrink:0}
.puesto-document h1,.puesto-document h2{font-size:23px;line-height:1.3;font-weight:700;margin:0 0 8px;letter-spacing:0}
.puesto-document .puesto-subtitle{font-size:15px;color:#64748b;margin:0 0 24px}
.puesto-document .puesto-section{border:1px solid #e2e8f0;border-radius:7px;margin:22px 0;overflow:hidden}
.puesto-document h3{font-size:13px;font-weight:600;margin:18px 0 10px;color:#2563eb}
.puesto-document .puesto-section>h3{margin:0;padding:11px 15px;background:#eff6ff;color:#2563eb;border-bottom:1px solid #e2e8f0}
.puesto-document p{margin:8px 0}
.puesto-document table{width:100%;border-collapse:collapse;table-layout:fixed;margin:0}
.puesto-document th,.puesto-document td{text-align:left;padding:12px 15px;border-bottom:1px solid #e2e8f0;font-size:12px;line-height:1.7;vertical-align:top;overflow-wrap:anywhere}
.puesto-document tbody tr:last-child>th,.puesto-document tbody tr:last-child>td{border-bottom:0}
.puesto-document thead th{background:#f8fafc;color:#64748b;font-size:11px;font-weight:600}
.puesto-document tbody tr:nth-child(even){background:#fbfcfe}
.puesto-document .puesto-fields th{width:32%;color:#64748b;font-weight:500}
.puesto-document .puesto-numbered th{width:46px;color:#64748b;font-weight:400;padding-right:0}
.puesto-document ul,.puesto-document ol{padding-left:22px;margin:8px 0}
.puesto-document ul{list-style:disc}.puesto-document ol{list-style:decimal}
.puesto-document li{margin:5px 0}
.puesto-document .puesto-footer{margin-top:28px;padding-top:12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px}
.puesto-document[contenteditable=true]:focus{outline:2px solid #2563eb;outline-offset:-2px}
.puesto-document[contenteditable=true] td:hover{background:#eff6ff}
@media(max-width:600px){.puesto-document{padding:22px 16px}.puesto-document th,.puesto-document td{padding:10px 9px}.puesto-document .puesto-logo{width:65px}.puesto-document h2{font-size:20px}.puesto-document .puesto-code{font-size:10px}}
`;

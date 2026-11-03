import React from "react";
import { FileText } from "lucide-react";
import { fmt } from "../../lib/format.js";
import { printReceiptDocument } from "../../lib/receipt.js";
import { Modal } from "../../components/common/SharedUI.jsx";

function OrderReceiptModal({order,store,onClose}){if(!order)return null;return <Modal title="Order receipt" onClose={onClose}><div><strong>{store?.storeName||"QuickCart Store"}</strong><p>Receipt #{String(order.id||"").slice(0,12)}</p><p>{order.customerName||"Customer"}</p><p>Total: {fmt(order.total)}</p></div><div className="modal-actions"><button className="primary-button" type="button" onClick={()=>printReceiptDocument(order,store)}><FileText size={17}/> Print receipt</button><button className="ghost-button" type="button" onClick={onClose}>Close</button></div></Modal>}

export default OrderReceiptModal;

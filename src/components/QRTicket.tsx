import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { Download, Share2 } from 'lucide-react';

interface QRTicketProps {
  ticketCode: string;
  eventTitle: string;
  userName: string;
}

export const QRTicket: React.FC<QRTicketProps> = ({ ticketCode, eventTitle, userName }) => {
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="glass-card p-8 flex flex-col items-center space-y-6 border border-white/10"
    >
      <div className="text-center">
        <h3 className="text-xl font-black text-white">{eventTitle}</h3>
        <p className="text-[#B0B0C3] text-sm">{userName}</p>
      </div>

      <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-[#6C63FF]/20">
        <QRCodeSVG 
          value={ticketCode} 
          size={180}
          level="H"
          includeMargin={true}
        />
      </div>

      <div className="text-center">
        <div className="text-xs font-mono text-[#6C63FF] tracking-widest uppercase">Ticket ID</div>
        <div className="text-lg font-bold text-white">{ticketCode}</div>
      </div>

      <div className="flex space-x-4 w-full">
        <button className="flex-1 py-3 bg-white/5 rounded-xl flex items-center justify-center space-x-2 text-white border border-white/10">
          <Download size={18} />
          <span className="text-sm">Save</span>
        </button>
        <button className="flex-1 py-3 gradient-bg rounded-xl flex items-center justify-center space-x-2 text-white">
          <Share2 size={18} />
          <span className="text-sm">Share</span>
        </button>
      </div>
    </motion.div>
  );
};

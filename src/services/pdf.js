import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getPartnerInfo } from './pairing';

// Emotion colors mapping for PDF
const emotionColors = {
  angry: '#e74c3c',
  sad: '#3498db',
  disappointed: '#95a5a6',
  grateful: '#2ecc71',
  happy: '#f39c12'
};

// Emotion icons mapping for PDF
const emotionIcons = {
  angry: '🔥',
  sad: '💧',
  disappointed: '🌫️',
  grateful: '✨',
  happy: '🌈'
};

// Generate PDF from history data
export const generateHistoryPDF = async (historyData, userId, partnerInfo = null) => {
  return new Promise((resolve, reject) => {
    try {
      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Page dimensions
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Add header
      doc.setFontSize(24);
      doc.setTextColor(44, 62, 80); // Dark blue
      doc.setFont('helvetica', 'bold');
      doc.text('For us By us - Emotional Journey', pageWidth / 2, 20, { align: 'center' });

      // Add subtitle
      doc.setFontSize(12);
      doc.setTextColor(102, 102, 102);
      doc.setFont('helvetica', 'normal');
      
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      let subtitle = `History Export - ${today}`;
      if (partnerInfo) {
        subtitle += ` • Partner: ${partnerInfo.username}`;
      }
      
      doc.text(subtitle, pageWidth / 2, 28, { align: 'center' });

      // Add decorative line
      doc.setDrawColor(102, 126, 234); // Purple
      doc.setLineWidth(0.5);
      doc.line(20, 35, pageWidth - 20, 35);

      // Stats section
      doc.setFontSize(16);
      doc.setTextColor(44, 62, 80);
      doc.text('Journey Overview', 20, 45);

      const totalChests = historyData.length;
      const totalChits = historyData.reduce((sum, chest) => sum + chest.chits.length, 0);
      
      // Calculate emotion distribution
      const emotionCounts = {};
      historyData.forEach(chest => {
        chest.chits.forEach(chit => {
          emotionCounts[chit.emotion] = (emotionCounts[chit.emotion] || 0) + 1;
        });
      });

      // Stats table
      const statsData = [
        ['Total Chests', totalChests.toString()],
        ['Total Chits', totalChits.toString()],
        ['Earliest Chest', historyData.length > 0 
          ? historyData[historyData.length - 1].unlockDate?.toLocaleDateString() || 'N/A' 
          : 'N/A'],
        ['Latest Chest', historyData.length > 0 
          ? historyData[0].unlockDate?.toLocaleDateString() || 'N/A' 
          : 'N/A']
      ];

      doc.autoTable({
        startY: 50,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'grid',
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 10,
          cellPadding: 5
        }
      });

      // Emotion distribution chart
      let yPos = doc.lastAutoTable.finalY + 15;
      
      doc.setFontSize(16);
      doc.setTextColor(44, 62, 80);
      doc.text('Emotion Distribution', 20, yPos);
      yPos += 10;

      const emotions = Object.keys(emotionCounts);
      if (emotions.length > 0) {
        const emotionData = emotions.map(emotion => [
          `${emotionIcons[emotion] || ''} ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`,
          emotionCounts[emotion].toString(),
          `${Math.round((emotionCounts[emotion] / totalChits) * 100)}%`
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Emotion', 'Count', 'Percentage']],
          body: emotionData,
          theme: 'grid',
          headStyles: {
            fillColor: [153, 102, 204],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 10,
            cellPadding: 5
          },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center' }
          }
        });
      } else {
        doc.setFontSize(11);
        doc.setTextColor(102, 102, 102);
        doc.text('No emotion data available', 20, yPos);
        yPos += 10;
      }

      // Detailed chest history
      doc.addPage();
      doc.setFontSize(20);
      doc.setTextColor(44, 62, 80);
      doc.text('Detailed Chest History', pageWidth / 2, 20, { align: 'center' });

      // Add each chest
      historyData.forEach((chest, chestIndex) => {
        const startY = chestIndex === 0 ? 30 : 10;
        
        if (chestIndex > 0) {
          doc.addPage();
        }

        // Chest header
        doc.setFontSize(16);
        doc.setTextColor(44, 62, 80);
        doc.setFont('helvetica', 'bold');
        doc.text(`Chest #${historyData.length - chestIndex}`, 20, startY);

        // Chest metadata
        doc.setFontSize(10);
        doc.setTextColor(102, 102, 102);
        doc.setFont('helvetica', 'normal');
        
        const metadata = [
          `Unlocked: ${chest.unlockDate?.toLocaleDateString() || 'N/A'}`,
          `Status: ${chest.status === 'completed' ? 'Completed' : 'Read'}`,
          `Total Chits: ${chest.chits.length}`
        ];

        let metadataY = startY + 8;
        metadata.forEach(line => {
          doc.text(line, 20, metadataY);
          metadataY += 5;
        });

        // Chits table
        const chitsTableData = chest.chits.map((chit, chitIndex) => {
          const date = chit.createdAt?.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) || 'N/A';
          
          return [
            `#${chitIndex + 1}`,
            `${emotionIcons[chit.emotion] || ''} ${chit.emotion.charAt(0).toUpperCase() + chit.emotion.slice(1)}`,
            date,
            chit.content.length > 100 ? chit.content.substring(0, 100) + '...' : chit.content
          ];
        });

        const tableStartY = metadataY + 10;
        
        doc.autoTable({
          startY: tableStartY,
          head: [['#', 'Emotion', 'Date', 'Content']],
          body: chitsTableData,
          theme: 'grid',
          headStyles: {
            fillColor: [52, 152, 219],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 9,
            cellPadding: 4,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 30, fontStyle: 'bold' },
            2: { cellWidth: 40 },
            3: { cellWidth: 'auto', minCellHeight: 15 }
          },
          margin: { left: 20, right: 20 },
          pageBreak: 'auto',
          didDrawPage: (data) => {
            // Add page numbers
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(102, 102, 102);
            doc.text(
              `Page ${data.pageNumber} of ${pageCount}`,
              pageWidth / 2,
              pageHeight - 10,
              { align: 'center' }
            );
          }
        });

        // If we're at the end of a page and there are more chests, add a separator
        if (chestIndex < historyData.length - 1) {
          doc.setDrawColor(221, 221, 221);
          doc.setLineWidth(0.3);
          doc.line(20, doc.internal.pageSize.height - 20, pageWidth - 20, doc.internal.pageSize.height - 20);
        }
      });

      // Add summary page
      doc.addPage();
      
      // Summary header
      doc.setFontSize(24);
      doc.setTextColor(44, 62, 80);
      doc.setFont('helvetica', 'bold');
      doc.text('Journey Summary', pageWidth / 2, 30, { align: 'center' });

      // Emotional insights
      doc.setFontSize(14);
      doc.text('Emotional Insights', 20, 50);

      // Calculate insights
      const insights = [];
      
      if (totalChits > 0) {
        const mostCommonEmotion = Object.entries(emotionCounts)
          .sort((a, b) => b[1] - a[1])[0];
        
        if (mostCommonEmotion) {
          insights.push(`Most frequent emotion: ${mostCommonEmotion[0]} (${mostCommonEmotion[1]} times)`);
        }

        const positivityRatio = (
          (emotionCounts.happy || 0) + 
          (emotionCounts.grateful || 0)
        ) / totalChits * 100;
        
        if (positivityRatio > 60) {
          insights.push('Predominantly positive emotional expression');
        } else if (positivityRatio < 30) {
          insights.push('More reflective and challenging emotions');
        }

        const uniqueEmotions = Object.keys(emotionCounts).length;
        if (uniqueEmotions >= 4) {
          insights.push('Diverse range of emotional expression');
        }
      }

      // Add insights
      let insightsY = 60;
      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51);
      
      if (insights.length > 0) {
        insights.forEach(insight => {
          doc.text('• ' + insight, 25, insightsY);
          insightsY += 8;
        });
      } else {
        doc.text('No insights available - not enough data', 25, insightsY);
        insightsY += 8;
      }

      // Final message
      doc.setFontSize(12);
      doc.setTextColor(102, 102, 102);
      doc.setFont('helvetica', 'italic');
      
      const finalMessages = [
        "Every shared emotion is a step in your journey.",
        "Thank you for using For us By us for thoughtful sharing.",
        "This PDF is for personal reflection only.",
        `Generated on ${today}`
      ];

      finalMessages.forEach((message, index) => {
        doc.text(message, pageWidth / 2, insightsY + 20 + (index * 8), { align: 'center' });
      });

      // Add footer with decorative element
      doc.setDrawColor(102, 126, 234);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);
      
      doc.setFontSize(8);
      doc.setTextColor(153, 153, 153);
      doc.text('For us By us • Emotional Time Capsule • Private & Secure', pageWidth / 2, pageHeight - 20, { align: 'center' });

      // Generate filename
      const filename = `for-us-by-us-history-${userId}-${Date.now()}.pdf`;

      // Save PDF
      doc.save(filename);
      
      resolve({
        success: true,
        filename,
        pageCount: doc.internal.getNumberOfPages(),
        totalChests,
        totalChits
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
};

// Generate a simple text export
export const generateTextExport = (historyData, userId) => {
  let text = '=== For us By us - Emotional Journey Export ===\n\n';
  
  // Add header
  text += `Export Date: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}\n`;
  text += `User ID: ${userId}\n`;
  text += `Total Chests: ${historyData.length}\n\n`;
  
  // Add each chest
  historyData.forEach((chest, chestIndex) => {
    text += `\n--- Chest #${historyData.length - chestIndex} ---\n`;
    text += `Unlocked: ${chest.unlockDate?.toLocaleDateString() || 'N/A'}\n`;
    text += `Status: ${chest.status === 'completed' ? 'Completed' : 'Read'}\n`;
    text += `Chits: ${chest.chits.length}\n\n`;
    
    // Add each chit
    chest.chits.forEach((chit, chitIndex) => {
      const date = chit.createdAt?.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) || 'N/A';
      
      text += `[${chitIndex + 1}] ${date} - ${chit.emotion.toUpperCase()}\n`;
      text += `${chit.content}\n\n`;
    });
    
    text += '\n';
  });
  
  // Add summary
  text += '\n=== Summary ===\n';
  
  const totalChits = historyData.reduce((sum, chest) => sum + chest.chits.length, 0);
  text += `Total chits exchanged: ${totalChits}\n`;
  
  // Emotion counts
  const emotionCounts = {};
  historyData.forEach(chest => {
    chest.chits.forEach(chit => {
      emotionCounts[chit.emotion] = (emotionCounts[chit.emotion] || 0) + 1;
    });
  });
  
  text += 'Emotion distribution:\n';
  Object.entries(emotionCounts).forEach(([emotion, count]) => {
    const percentage = Math.round((count / totalChits) * 100);
    text += `  ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}: ${count} (${percentage}%)\n`;
  });
  
  // Add footer
  text += '\n=== End of Export ===\n';
  text += 'Generated by For us By us - A space for thoughtful emotional sharing.\n';
  text += 'This export is for personal reflection only.\n';
  
  return text;
};

// Export history to text file
export const exportHistoryAsText = (historyData, userId) => {
  const text = generateTextExport(historyData, userId);
  const filename = `the-chest-history-${userId}-${Date.now()}.txt`;
  
  // Create blob and download
  const blob = new Blob([text], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  return {
    success: true,
    filename,
    size: blob.size
  };
};

// Check if jsPDF is available
export const isPDFSupported = () => {
  return typeof jsPDF !== 'undefined';
};
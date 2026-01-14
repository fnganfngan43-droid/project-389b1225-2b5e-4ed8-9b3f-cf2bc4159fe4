import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportData {
  title: string;
  subtitle?: string;
  currency?: string;
  content: string;
  companyName?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Generate PDF from report data
export const generateReportPDF = async (elementId: string, fileName: string): Promise<Blob | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    return null;
  }

  try {
    // Create a clone to style for PDF
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = '800px';
    clone.style.padding = '20px';
    clone.style.backgroundColor = 'white';
    clone.style.color = 'black';
    
    // Temporarily add to document
    document.body.appendChild(clone);
    
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    
    // Remove clone
    document.body.removeChild(clone);
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    
    // Handle multi-page content
    const pageHeight = pdfHeight - 20;
    const scaledHeight = imgHeight * ratio;
    
    if (scaledHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', imgX, 10, imgWidth * ratio, imgHeight * ratio);
    } else {
      // Multi-page handling
      let heightLeft = scaledHeight;
      let position = 10;
      let page = 1;
      
      while (heightLeft > 0) {
        if (page > 1) {
          pdf.addPage();
          position = 10;
        }
        
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pageHeight;
        position -= pageHeight;
        page++;
      }
    }
    
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
};

// Share PDF via WhatsApp
export const shareViaWhatsApp = async (elementId: string, reportTitle: string): Promise<boolean> => {
  try {
    const pdfBlob = await generateReportPDF(elementId, reportTitle);
    
    if (!pdfBlob) {
      return false;
    }
    
    // Create a file from the blob
    const file = new File([pdfBlob], `${reportTitle}.pdf`, { type: 'application/pdf' });
    
    // Check if Web Share API is available and can share files
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: reportTitle,
        text: `تقرير: ${reportTitle}`,
      });
      return true;
    } else {
      // Fallback: Download PDF and provide WhatsApp web link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Open WhatsApp with message
      const whatsappMessage = encodeURIComponent(`تقرير: ${reportTitle}\n\nتم تحميل التقرير كملف PDF`);
      window.open(`https://wa.me/?text=${whatsappMessage}`, '_blank');
      
      return true;
    }
  } catch (error) {
    console.error('Error sharing via WhatsApp:', error);
    return false;
  }
};

// Download PDF directly
export const downloadPDF = async (elementId: string, fileName: string): Promise<boolean> => {
  try {
    const pdfBlob = await generateReportPDF(elementId, fileName);
    
    if (!pdfBlob) {
      return false;
    }
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return false;
  }
};

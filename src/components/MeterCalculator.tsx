
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Download, FileText, Image, FileSpreadsheet, Plus, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

interface TenantReading {
  id: string;
  name: string;
  previous: number;
  current: number;
}

interface CalculationResult {
  name: string;
  used: number;
  bonus: number;
  finalUnits: number;
  bill: number;
  percentage: number;
}

const MeterCalculator = () => {
  const { toast } = useToast();
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [readings, setReadings] = useState<TenantReading[]>([
    { id: '1', name: 'Tenant A', previous: 97.87, current: 126.95 },
    { id: '2', name: 'Tenant B', previous: 155.3, current: 175.4 },
  ]);
  
  const [totalUnits, setTotalUnits] = useState<number>(52.8);
  const [totalAmount, setTotalAmount] = useState<number>(12000);
  
  const addTenant = () => {
    const newId = Date.now().toString();
    setReadings([...readings, { id: newId, name: `Tenant ${String.fromCharCode(65 + readings.length)}`, previous: 0, current: 0 }]);
  };
  
  const removeTenant = (id: string) => {
    if (readings.length > 1) {
      setReadings(readings.filter(r => r.id !== id));
    } else {
      toast({
        title: "Cannot remove tenant",
        description: "At least one tenant is required.",
        variant: "destructive"
      });
    }
  };
  
  const updateReading = (id: string, field: keyof TenantReading, value: string | number) => {
    setReadings(readings.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };
  
  // Calculations
  const unitPrice = totalAmount / totalUnits;
  
  const usage = readings.map(r => ({
    ...r,
    used: parseFloat((r.current - r.previous).toFixed(2)),
  }));
  
  const totalUsed = usage.reduce((acc, r) => acc + r.used, 0);
  const unaccounted = parseFloat((totalUnits - totalUsed).toFixed(2));
  const bonusPerTenant = parseFloat((unaccounted / usage.length).toFixed(2));
  
  const results: CalculationResult[] = usage.map(r => {
    const finalUnits = r.used + bonusPerTenant;
    const share = finalUnits / totalUnits;
    const bill = share * totalAmount;
    return {
      name: r.name,
      used: r.used,
      bonus: bonusPerTenant,
      finalUnits: parseFloat(finalUnits.toFixed(2)),
      bill: parseFloat(bill.toFixed(2)),
      percentage: parseFloat((share * 100).toFixed(2)),
    };
  });
  
  // Export Functions
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Electricity Bill Split Report', 14, 22);
    
    // Summary info
    doc.setFontSize(12);
    doc.text(`Total Units Purchased: ${totalUnits} kWh`, 14, 35);
    doc.text(`Total Amount: ₦${totalAmount.toLocaleString()}`, 14, 42);
    doc.text(`Unit Price: ₦${unitPrice.toFixed(2)}/kWh`, 14, 49);
    doc.text(`Unaccounted Units: ${unaccounted} kWh`, 14, 56);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 63);
    
    // Table data
    const tableData = results.map(r => [
      r.name,
      r.used.toString(),
      r.bonus.toString(),
      r.finalUnits.toString(),
      r.percentage.toString() + '%',
      '₦' + r.bill.toLocaleString()
    ]);
    
    (doc as any).autoTable({
      head: [['Tenant', 'Used (kWh)', 'Unaccounted (kWh)', 'Final Units (kWh)', 'Share (%)', 'Bill Amount']],
      body: tableData,
      startY: 75,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    });
    
    doc.save('electricity-bill-split.pdf');
    
    toast({
      title: "PDF Export Successful",
      description: "The report has been downloaded as PDF.",
    });
  };
  
  const exportToExcel = () => {
    const worksheetData = [
      ['Electricity Bill Split Report'],
      [''],
      ['Summary Information'],
      ['Total Units Purchased (kWh)', totalUnits],
      ['Total Amount (₦)', totalAmount],
      ['Unit Price (₦/kWh)', parseFloat(unitPrice.toFixed(2))],
      ['Unaccounted Units (kWh)', unaccounted],
      ['Generation Date', new Date().toLocaleDateString()],
      [''],
      ['Detailed Breakdown'],
      ['Tenant', 'Used (kWh)', 'Unaccounted (kWh)', 'Final Units (kWh)', 'Share (%)', 'Bill Amount (₦)'],
      ...results.map(r => [r.name, r.used, r.bonus, r.finalUnits, r.percentage, r.bill])
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bill Split');
    
    XLSX.writeFile(workbook, 'electricity-bill-split.xlsx');
    
    toast({
      title: "Excel Export Successful",
      description: "The report has been downloaded as Excel file.",
    });
  };
  
  const exportToPNG = async () => {
    if (tableRef.current) {
      try {
        const canvas = await html2canvas(tableRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
        });
        
        const link = document.createElement('a');
        link.download = 'electricity-bill-split.png';
        link.href = canvas.toDataURL();
        link.click();
        
        toast({
          title: "PNG Export Successful",
          description: "The report has been downloaded as PNG image.",
        });
      } catch (error) {
        toast({
          title: "Export Failed",
          description: "Failed to generate PNG image.",
          variant: "destructive"
        });
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Meter Share Calculator</h1>
          <p className="text-lg text-gray-600">Split electricity bills fairly among tenants</p>
        </div>
        
        {/* Input Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Bill Details */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Bill Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="totalUnits">Total Units Purchased (kWh)</Label>
                <Input
                  id="totalUnits"
                  type="number"
                  step="0.01"
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="totalAmount">Total Amount (₦)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Unit Price:</strong> ₦{unitPrice.toFixed(2)}/kWh
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Unaccounted Units:</strong> {unaccounted} kWh
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Export Options */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={exportToPDF} className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
              <Button onClick={exportToExcel} className="w-full" variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </Button>
              <Button onClick={exportToPNG} className="w-full" variant="outline">
                <Image className="h-4 w-4 mr-2" />
                Export as PNG
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Tenant Readings */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Tenant Meter Readings</CardTitle>
              <Button onClick={addTenant} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {readings.map((reading, index) => (
                <div key={reading.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div>
                    <Label>Tenant Name</Label>
                    <Input
                      value={reading.name}
                      onChange={(e) => updateReading(reading.id, 'name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Previous Reading</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={reading.previous}
                      onChange={(e) => updateReading(reading.id, 'previous', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Current Reading</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={reading.current}
                      onChange={(e) => updateReading(reading.id, 'current', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Usage (kWh)</Label>
                    <Input
                      value={(reading.current - reading.previous).toFixed(2)}
                      readOnly
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => removeTenant(reading.id)}
                      variant="destructive"
                      size="sm"
                      disabled={readings.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Results Table */}
        <Card className="shadow-lg" ref={tableRef}>
          <CardHeader>
            <CardTitle>Bill Split Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="border border-gray-300 px-4 py-3 text-left">Tenant</th>
                    <th className="border border-gray-300 px-4 py-3 text-center">Used (kWh)</th>
                    <th className="border border-gray-300 px-4 py-3 text-center">+Unaccounted (kWh)</th>
                    <th className="border border-gray-300 px-4 py-3 text-center">Final Units (kWh)</th>
                    <th className="border border-gray-300 px-4 py-3 text-center">Share (%)</th>
                    <th className="border border-gray-300 px-4 py-3 text-right">Bill Amount (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="border border-gray-300 px-4 py-3 font-medium">{result.name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">{result.used}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">{result.bonus}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center font-medium">{result.finalUnits}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">{result.percentage}%</td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-bold text-green-700">
                        ₦{result.bill.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-100 font-bold">
                    <td className="border border-gray-300 px-4 py-3">TOTAL</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">{totalUsed.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">{unaccounted}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">{totalUnits}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">100%</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-blue-700">
                      ₦{totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Summary Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Units:</span>
                  <div className="font-semibold">{totalUnits} kWh</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Amount:</span>
                  <div className="font-semibold">₦{totalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Unit Price:</span>
                  <div className="font-semibold">₦{unitPrice.toFixed(2)}/kWh</div>
                </div>
                <div>
                  <span className="text-gray-600">Unaccounted:</span>
                  <div className="font-semibold">{unaccounted} kWh</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MeterCalculator;

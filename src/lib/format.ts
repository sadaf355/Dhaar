export const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
export const shortMoney=(n:number)=>n>=10000000?`₹${(n/10000000).toFixed(1)} Cr`:n>=100000?`₹${(n/100000).toFixed(1)} L`:`₹${n.toLocaleString('en-IN')}`;

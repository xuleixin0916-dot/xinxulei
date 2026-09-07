import assert from 'node:assert/strict';
import fs from 'node:fs';
import {expandOrders,summarizeSystemSales,compareSystemSales} from './order-accounting.ts';
const definitions=[{shop:'test',salesSku:'COMBO',expression:'A*2-B',components:[{systemSku:'A',quantity:2,fob:10},{systemSku:'B',quantity:1,fob:20}]}];
const costs=[{shop:'test',salesSku:'COMBO',systemSku:'A*2-B',fixedCost:30,variableRate:.1}];
const raw=[{id:1,orderNo:'ORDER',orderDate:'2026-08-31',salesSku:'COMBO',quantity:2,revenue:101,isReplacement:1}];
const result=expandOrders(raw,costs,definitions,'test');
assert.equal(result.length,6);assert.equal(Math.round(result.reduce((s,x)=>s+x.revenue,0)*100),10100);
assert.equal(Math.round(result.reduce((s,x)=>s+x.profit,0)*100),3090);
assert.equal(new Set(result.map(x=>x.orderNo)).size,6);
const stats=summarizeSystemSales(result);assert.equal(stats.find(x=>x.sku==='A').quantity,4);assert.equal(stats.find(x=>x.sku==='B').replacementQuantity,2);
assert.equal(compareSystemSales(stats,'2026-09-01','2026-08-31').find(x=>x.sku==='A').growth,-100);
const missing=expandOrders([{...raw[0],salesSku:'UNKNOWN'}],costs,definitions,'test');assert.equal(summarizeSystemSales(missing).length,0);
const missingFob=expandOrders(raw,costs,[{...definitions[0],components:[{systemSku:'A',quantity:2,fob:0},{systemSku:'B',quantity:1,fob:20}]}],'test');assert.equal(missingFob[0].revenue,null);
const catalog=JSON.parse(fs.readFileSync(new URL('./data/profit-catalog.json',import.meta.url),'utf8'));
const defs=JSON.parse(fs.readFileSync(new URL('./data/order-components.json',import.meta.url),'utf8'));
for(const d of defs.filter(x=>x.components.length)){
  const row={id:1,orderNo:'T',orderDate:'2026-08-31',salesSku:d.salesSku,quantity:2,revenue:123.45};
  const expanded=expandOrders([row],catalog,[d],d.shop);
  assert.equal(expanded.length,d.components.reduce((s,c)=>s+c.quantity,0)*2);
  if(expanded.every(x=>x.revenue!=null))assert.equal(Math.round(expanded.reduce((s,x)=>s+x.revenue,0)*100),12345);
}
console.log('PASS: multi-SKU, repeated units, FOB cents, profit conservation, replacement, missing mapping/FOB, previous-day-only SKU and all resolved catalog mappings');

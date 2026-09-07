type Component = {systemSku:string;quantity:number;fob:number};
type InputOrder = Record<string, any>;
export function expandOrders(orders:InputOrder[], catalog:InputOrder[], definitions:InputOrder[], shop:string, mappings:InputOrder[]=[]){
  const prices=new Map(catalog.filter(p=>p.shop===shop).map(p=>[p.salesSku,p]));
  const defs=new Map(definitions.filter(p=>p.shop===shop).map(p=>[p.salesSku,p]));
  const numbers=new Map<string,number>();
  return orders.flatMap<InputOrder>(o=>{
    const salesSku=String(o.salesSku||o.sku||''); const p=prices.get(salesSku);
    const def=defs.get(salesSku);
    const mapping=mappings.find(m=>m.salesSku===salesSku);
    const expression=String(p?.systemSku||mapping?.systemSku||'');
    const components:Component[]=def ? def.components : definitions.find(d=>d.shop===shop&&d.expression===expression)?.components||[];
    const units=components.flatMap(c=>Array.from({length:c.quantity*Number(o.quantity)},()=>c));
    if(!units.length)return [{...o,salesSku,systemSku:'未映射 / 待拆分',componentCount:0,splitStatus:'缺少子SKU映射，不计入系统SKU销量',profit:null,profitMargin:null}];
    const totalFob=units.reduce((s,c)=>s+c.fob,0);
    const costable=units.length===1 || units.every(c=>c.fob>0);
    const cents=Math.round(Number(o.revenue)*100); let allocated=0;
    const totalProfit=p?Number(o.revenue)*(1-p.variableRate)-Number(o.quantity)*p.fixedCost:null;
    let allocatedProfit=0;
    return units.map((c,i)=>{
      const share=units.length===1?1:c.fob/totalFob;
      const amount=costable?(i===units.length-1?cents-allocated:Math.round(cents*share)):null;
      allocated+=amount||0;
      const profitCents=costable&&totalProfit!=null?(i===units.length-1?Math.round(totalProfit*100)-allocatedProfit:Math.round(totalProfit*100*share)):null;
      allocatedProfit+=profitCents||0;
      const base=String(o.sourceOrderNo||o.orderNo); const n=(numbers.get(base)||0)+1;numbers.set(base,n);
      return {...o,id:`${o.id}:${i+1}`,sourceOrderNo:base,orderNo:`${base}-${n}`,salesSku,systemSku:c.systemSku,quantity:1,sourceRevenue:Number(o.revenue),revenue:amount==null?null:amount/100,
        profit:profitCents==null?null:profitCents/100,profitMargin:amount?Number(profitCents)/amount:null,
        componentCount:components.reduce((s,c)=>s+c.quantity,0),splitStatus:costable?'已按子SKU数量拆分 / FOB分摊':'已拆分数量；缺少子SKU FOB，金额待核查'};
    });
  });
}
export function summarizeSystemSales(orders:InputOrder[]){
  const groups=new Map<string,any>();
  for(const o of orders){
    if(!o.componentCount)continue;
    const key=`${o.orderDate}|${o.systemSku}`;
    const g=groups.get(key)||{date:o.orderDate,sku:o.systemSku,quantity:0,replacementQuantity:0,revenue:0,pendingAmount:0,orderIds:new Set()};
    g.quantity+=o.quantity;g.replacementQuantity+=o.isReplacement?o.quantity:0;
    g.revenue+=o.revenue||0;g.pendingAmount+=o.revenue==null?1:0;g.orderIds.add(o.sourceOrderNo||o.orderNo);groups.set(key,g);
  }
  return [...groups.values()].map(({orderIds,...g})=>({...g,orderCount:orderIds.size,revenue:Math.round(g.revenue*100)/100})).sort((a,b)=>b.date.localeCompare(a.date)||b.quantity-a.quantity);
}
export function compareSystemSales(stats:ReturnType<typeof summarizeSystemSales>,date:string,previousDate:string){
  const today=new Map(stats.filter(x=>x.date===date).map(x=>[x.sku,x.quantity]));
  const previous=new Map(stats.filter(x=>x.date===previousDate).map(x=>[x.sku,x.quantity]));
  return [...new Set([...today.keys(),...previous.keys()])].map(sku=>({sku,qty:today.get(sku)||0,previous:previous.get(sku)||0,growth:previous.get(sku)?Math.round(((today.get(sku)||0)-(previous.get(sku)||0))/(previous.get(sku)||1)*100):100})).sort((a,b)=>b.qty-a.qty);
}

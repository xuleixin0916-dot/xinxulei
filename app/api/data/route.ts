import { env } from 'cloudflare:workers';
import { schemaStatements } from '@/db/schema';
import profitCatalog from '@/app/data/profit-catalog.json';
import vhProductCatalog from '@/app/data/vh-product-catalog.json';
import orderComponents from '@/app/data/order-components.json';
import {expandOrders,summarizeSystemSales,compareSystemSales} from '@/app/order-accounting';

type DbEnv = { DB: D1Database };
const db = () => (env as unknown as DbEnv).DB;

async function init() {
  const d1 = db();
  await d1.batch(schemaStatements.map((sql) => d1.prepare(sql)));
  const count = await d1
    .prepare('SELECT COUNT(*) AS total FROM products')
    .first<{ total: number }>();
  if (!count?.total) {
    await d1.batch([
      d1
        .prepare(
          `INSERT INTO products (sku,name,image,wholesale_price,retail_price,category,status,checked,frontend_url,description) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          'BBB-240831-01',
          '四季全棉绗缝床盖三件套',
          'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=160&q=80',
          28.6,
          69.99,
          'Bedding',
          '正常',
          1,
          'https://www.bedbathandbeyond.com',
          '全棉面料，三件套装',
        ),
      d1
        .prepare(
          `INSERT INTO products (sku,name,image,wholesale_price,retail_price,category,status,checked,frontend_url,description) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          'BBB-240831-02',
          '北欧棉麻装饰抱枕套',
          'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=160&q=80',
          8.2,
          19.99,
          'Home Decor',
          '待核查',
          0,
          'https://www.bedbathandbeyond.com',
          '北欧风棉麻抱枕套',
        ),
      d1
        .prepare(
          `INSERT INTO products (sku,name,image,wholesale_price,retail_price,category,status,checked,frontend_url,description) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          'BBB-240831-03',
          '竹纤维吸水浴巾套装',
          'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=160&q=80',
          18.9,
          36.99,
          'Bath',
          '低利润',
          0,
          'https://www.bedbathandbeyond.com',
          '高吸水竹纤维浴巾',
        ),
    ]);
  }
  const orderCount = await d1
    .prepare('SELECT COUNT(*) AS total FROM orders')
    .first<{ total: number }>();
  if (!orderCount?.total) {
    const skus = ['BBB-240831-01', 'BBB-240831-02', 'BBB-240831-03'];
    const seeds = [];
    for (let day = 6; day >= 0; day--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - day);
      const date = d.toISOString().slice(0, 10);
      for (let i = 0; i < 3; i++) {
        const qty = Math.max(1, 8 - day + i * 2 + (day % 3));
        seeds.push(
          d1
            .prepare(
              `INSERT OR IGNORE INTO orders(order_date,order_no,sku,quantity,revenue,status) VALUES(?,?,?,?,?,?)`,
            )
            .bind(
              date,
              `DEMO-${date}-${i + 1}`,
              skus[i],
              qty,
              Number((qty * [69.99, 19.99, 36.99][i]).toFixed(2)),
              '已付款',
            ),
        );
      }
    }
    await d1.batch(seeds);
  }
  const mappingCount = await d1
    .prepare('SELECT COUNT(*) AS total FROM sales_sku_mappings')
    .first<{ total: number }>();
  if (!mappingCount?.total)
    await d1.batch([
      d1
        .prepare(
          `INSERT OR IGNORE INTO sales_sku_mappings(platform,sales_sku,system_sku,display_name) VALUES(?,?,?,?)`,
        )
        .bind(
          'Bed Bath & Beyond',
          'BBB-BEDDING-QUEEN-GRAY',
          'BBB-240831-01',
          '全棉床盖-灰色Queen',
        ),
      d1
        .prepare(
          `INSERT OR IGNORE INTO sales_sku_mappings(platform,sales_sku,system_sku,display_name) VALUES(?,?,?,?)`,
        )
        .bind(
          'Bed Bath & Beyond',
          'BBB-PILLOW-NORDIC-45',
          'BBB-240831-02',
          '北欧抱枕套45cm',
        ),
      d1
        .prepare(
          `INSERT OR IGNORE INTO sales_sku_mappings(platform,sales_sku,system_sku,display_name) VALUES(?,?,?,?)`,
        )
        .bind(
          'Bed Bath & Beyond',
          'BBB-TOWEL-BAMBOO-SET',
          'BBB-240831-03',
          '竹纤维浴巾套装',
        ),
    ]);
  return d1;
}

export async function GET(request: Request) {
  const d1 = await init();
  const params = new URL(request.url).searchParams;
  const shop = params.get('shop') === 'BBB-VH-3' ? 'BBB-VH-3' : 'BBB-PB-2';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('orderDate') || '') ? String(params.get('orderDate')) : new Date().toISOString().slice(0, 10);
  const yesterday = new Date(`${date}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10);
  const [
    products,
    tasks,
    log,
    orders,
    dailySummary,
    skuToday,
    skuYesterday,
    mappings,
    productChecks,
    linkMetricRows,
    monitorTargetRows,
    allOrderRows,
  ] = await Promise.all([
    d1
      .prepare(
        `SELECT id,sku,name,image,wholesale_price AS cost,retail_price AS price,category,status,checked,backend_url AS backend,frontend_url AS frontend,description FROM products ORDER BY id DESC`,
      )
      .all(),
    d1
      .prepare(
        `SELECT id,work_time AS time,title,tag,color,completed FROM schedules WHERE work_date=? ORDER BY work_time`,
      )
      .bind(date)
      .all(),
    d1
      .prepare(
        `SELECT completed_text AS completedText,followup_text AS followupText FROM daily_logs WHERE work_date=?`,
      )
      .bind(date)
      .first(),
    d1
      .prepare(
        `SELECT o.id,o.order_date AS orderDate,o.order_no AS orderNo,o.source_order_no AS sourceOrderNo,o.shop,o.sku,o.sku AS salesSku,o.platform_sku AS platformSku,o.customer_info AS customerInfo,o.item_price AS itemPrice,o.is_replacement AS isReplacement,COALESCE(m.system_sku,'未映射') AS systemSku,o.quantity,o.revenue,o.status FROM orders o LEFT JOIN sales_sku_mappings_v2 m ON m.shop=o.shop AND m.sales_sku=o.sku WHERE o.order_date=? AND o.shop=? ORDER BY o.id DESC`,
      )
      .bind(date, shop)
      .all(),
    d1
      .prepare(
        `SELECT order_date AS date,SUM(quantity) AS orders,ROUND(SUM(revenue),2) AS revenue FROM orders WHERE order_date>=date(?, '-6 day') AND shop=? AND order_date<=? GROUP BY order_date ORDER BY order_date`,
      )
      .bind(date, shop, date)
      .all(),
    d1
      .prepare(
        `SELECT COALESCE(m.system_sku,o.sku) AS sku,SUM(o.quantity) AS qty FROM orders o LEFT JOIN sales_sku_mappings_v2 m ON m.shop=o.shop AND m.sales_sku=o.sku WHERE o.order_date=? AND o.shop=? GROUP BY COALESCE(m.system_sku,o.sku)`,
      )
      .bind(date, shop)
      .all(),
    d1
      .prepare(
        `SELECT COALESCE(m.system_sku,o.sku) AS sku,SUM(o.quantity) AS qty FROM orders o LEFT JOIN sales_sku_mappings_v2 m ON m.shop=o.shop AND m.sales_sku=o.sku WHERE o.order_date=? AND o.shop=? GROUP BY COALESCE(m.system_sku,o.sku)`,
      )
      .bind(yesterdayDate, shop)
      .all(),
    d1
      .prepare(
        `SELECT id,shop,platform,sales_sku AS salesSku,system_sku AS systemSku,display_name AS displayName,active FROM sales_sku_mappings_v2 WHERE shop=? ORDER BY platform,sales_sku`,
      )
      .bind(shop)
      .all(),
    d1.prepare(`SELECT sales_sku AS salesSku,checked FROM product_checks WHERE shop=?`).bind(shop).all(),
    d1.prepare(`SELECT id,metric_date AS metricDate,platform_sku AS platformSku,link_url AS linkUrl,title,rank_position AS rankPosition,rating,review_count AS reviewCount,low_star_count AS lowStarCount,created_at AS createdAt FROM link_metrics WHERE shop=? ORDER BY metric_date DESC,created_at DESC`).bind(shop).all(),
    d1.prepare(`SELECT id,platform_sku AS platformSku,sales_sku AS salesSku,title,link_url AS linkUrl,category,keyword,priority,active,updated_at AS updatedAt FROM monitor_targets WHERE shop=? ORDER BY priority DESC,updated_at DESC`).bind(shop).all(),
    d1.prepare(`SELECT id,order_date AS orderDate,order_no AS orderNo,source_order_no AS sourceOrderNo,sku AS salesSku,platform_sku AS platformSku,quantity,revenue,status,customer_info AS customerInfo,is_replacement AS isReplacement FROM orders WHERE shop=? ORDER BY order_date,order_no,id`).bind(shop).all(),
  ]);
  const previous = new Map(
    (skuYesterday.results as { sku: string; qty: number }[]).map((x) => [
      x.sku,
      x.qty,
    ]),
  );
  const skuGrowth = (skuToday.results as { sku: string; qty: number }[])
    .map((x) => ({
      sku: x.sku,
      qty: x.qty,
      previous: previous.get(x.sku) || 0,
      growth: previous.get(x.sku)
        ? Number(
            (
              ((x.qty - (previous.get(x.sku) || 0)) /
                (previous.get(x.sku) || 1)) *
              100
            ).toFixed(1),
          )
        : 100,
    }))
    .sort((a, b) => b.growth - a.growth);
  const shopProfits = profitCatalog.filter((x) => x.shop === shop);
  const profitBySalesSku = new Map(shopProfits.map((x) => [x.salesSku, x]));
  const enrichedOrders = (orders.results as Array<Record<string, unknown>>).map((o) => {
    const p = profitBySalesSku.get(String(o.salesSku || o.sku || ''));
    const revenue = Number(o.revenue || 0);
    const quantity = Number(o.quantity || 0);
    const profit = p ? revenue * (1 - p.variableRate) - quantity * p.fixedCost : null;
    return { ...o, systemSku: p?.systemSku || o.systemSku, fixedCost: p?.fixedCost ?? null, variableRate: p?.variableRate ?? null,
      profit: profit == null ? null : Number(profit.toFixed(2)),
      profitMargin: profit == null || !revenue ? null : Number((profit / revenue).toFixed(4)),
      componentCount: p?.componentCount ?? 0 };
  });
  const validMargins = shopProfits.filter((x) => x.margin != null);
  const profitStats = {
    total: shopProfits.length,
    lowProfit: validMargins.filter((x) => Number(x.margin) < 0.1).length,
    negative: validMargins.filter((x) => Number(x.margin) < 0).length,
    averageMargin: validMargins.length ? validMargins.reduce((s, x) => s + Number(x.margin), 0) / validMargins.length : 0,
  };
  const checkedMap = new Map((productChecks.results as Array<{salesSku:string;checked:number}>).map((x)=>[x.salesSku,x.checked]));
  const displayProducts = shop === 'BBB-VH-3'
    ? vhProductCatalog.map((x)=>({...x,checked:checkedMap.get(x.sku) || 0}))
    : products.results;
  const metricGroups = new Map<string, Array<Record<string, unknown>>>();
  for (const row of linkMetricRows.results as Array<Record<string, unknown>>) {
    const key=String(row.platformSku || ''); const group=metricGroups.get(key) || [];
    if (group.length < 2) group.push(row); metricGroups.set(key,group);
  }
  const linkMetrics=Array.from(metricGroups.values()).map((group)=>{
    const current=group[0], previous=group[1];
    return {...current,
      rankChange: previous ? Number(previous.rankPosition||0)-Number(current.rankPosition||0) : 0,
      reviewDelta: previous ? Number(current.reviewCount||0)-Number(previous.reviewCount||0) : 0,
      lowStarDelta: previous ? Number(current.lowStarCount||0)-Number(previous.lowStarCount||0) : 0,
      ratingChange: previous ? Number((Number(current.rating||0)-Number(previous.rating||0)).toFixed(2)) : 0,
      previousDate: previous?.metricDate || null};
  }).sort((a,b)=>Number(b.lowStarDelta)-Number(a.lowStarDelta) || Number(b.reviewDelta)-Number(a.reviewDelta));
  const expandedOrders=expandOrders(allOrderRows.results as Record<string,any>[],profitCatalog,orderComponents,shop,mappings.results as Record<string,any>[]);
  const systemSales=summarizeSystemSales(expandedOrders);
  const dailyProfitSummary=[...new Set(expandedOrders.map(o=>o.orderDate))].map(day=>{const rows=expandedOrders.filter(o=>o.orderDate===day&&o.revenue!=null);const revenue=rows.reduce((s,o)=>s+Number(o.revenue||0),0);const profit=rows.reduce((s,o)=>s+Number(o.profit||0),0);return {date:day,revenue:Number(revenue.toFixed(2)),profit:Number(profit.toFixed(2)),margin:revenue?Number((profit/revenue).toFixed(4)):null};});
  return Response.json({
    products: displayProducts,
    tasks: tasks.results,
    log: log ?? { completedText: '', followupText: '' },
    orders: expandedOrders.filter(o=>o.orderDate===date),
    allOrders: expandedOrders,
    dailySummary: dailySummary.results,
    skuGrowth: compareSystemSales(systemSales,date,yesterdayDate),
    systemSales,
    dailyProfitSummary,
    unresolvedOrders:expandedOrders.filter(o=>o.orderDate===date&&!o.componentCount).length,
    mappings: mappings.results,
    profitCatalog: shopProfits.sort((a, b) => Number(a.margin ?? -99) - Number(b.margin ?? -99)),
    profitStats,
    linkMetrics,
    monitorTargets: monitorTargetRows.results,
    linkMetricSummary:{total:linkMetrics.length,rankUp:linkMetrics.filter(x=>Number(x.rankChange)>0).length,rankDown:linkMetrics.filter(x=>Number(x.rankChange)<0).length,newReviews:linkMetrics.reduce((s,x)=>s+Math.max(0,Number(x.reviewDelta)),0),alerts:linkMetrics.filter(x=>Number(x.lowStarDelta)>0).length},
    shop,
  });
}

export async function POST(request: Request) {
  const d1 = await init();
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action ?? '');
  if (action === 'addProduct')
    await d1
      .prepare(
        `INSERT INTO products (sku,name,image,wholesale_price,retail_price,category,status,backend_url,frontend_url,description) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        body.sku,
        body.name,
        body.image || '',
        body.cost,
        body.price,
        body.category,
        body.status,
        body.backend || '',
        body.frontend || '',
        body.description || '',
      )
      .run();
  else if (action === 'toggleProduct') {
    if (body.shop && body.sku) await d1.prepare(`INSERT INTO product_checks(shop,sales_sku,checked,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(shop,sales_sku) DO UPDATE SET checked=excluded.checked,updated_at=CURRENT_TIMESTAMP`).bind(body.shop,body.sku,body.checked?1:0).run();
    else await d1.prepare(`UPDATE products SET checked=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(body.checked ? 1 : 0, body.id).run();
  }
  else if (action === 'deleteProduct')
    await d1.prepare(`DELETE FROM products WHERE id=?`).bind(body.id).run();
  else if (action === 'addTask')
    await d1
      .prepare(
        `INSERT INTO schedules (work_date,work_time,title,tag,color) VALUES (?,?,?,?,?)`,
      )
      .bind(
        new Date().toISOString().slice(0, 10),
        body.time,
        body.title,
        body.tag,
        body.color || '#466b5c',
      )
      .run();
  else if (action === 'toggleTask')
    await d1
      .prepare(`UPDATE schedules SET completed=? WHERE id=?`)
      .bind(body.completed ? 1 : 0, body.id)
      .run();
  else if (action === 'saveLog')
    await d1
      .prepare(
        `INSERT INTO daily_logs(work_date,completed_text,followup_text,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(work_date) DO UPDATE SET completed_text=excluded.completed_text,followup_text=excluded.followup_text,updated_at=CURRENT_TIMESTAMP`,
      )
      .bind(
        new Date().toISOString().slice(0, 10),
        body.completedText || '',
        body.followupText || '',
      )
      .run();
  else if (action === 'addOrder')
    await d1
      .prepare(
        `INSERT INTO orders(order_date,order_no,sku,quantity,revenue,status,shop) VALUES(?,?,?,?,?,?,?)`,
      )
      .bind(
        body.orderDate || new Date().toISOString().slice(0, 10),
        body.orderNo,
        body.sku,
        body.quantity,
        body.revenue,
        body.status || '已付款',
        body.shop === 'BBB-VH-3' ? 'BBB-VH-3' : 'BBB-PB-2',
      )
      .run();
  else if (action === 'importOrders') {
    const rows = body.rows as Array<{orderDate:string;orderNo:string;sourceOrderNo:string;salesSku:string;platformSku:string;quantity:number;revenue:number;itemPrice:number;customerInfo:string;isReplacement:boolean;status?:string}>;
    const shop = body.shop === 'BBB-VH-3' ? 'BBB-VH-3' : 'BBB-PB-2';
    for (let start = 0; start < rows.length; start += 80) {
      await d1.batch(rows.slice(start, start + 80).map((x) => d1.prepare(
        `INSERT INTO orders(order_date,order_no,source_order_no,sku,platform_sku,quantity,revenue,item_price,customer_info,is_replacement,status,shop) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(order_no) DO UPDATE SET order_date=excluded.order_date,source_order_no=excluded.source_order_no,sku=excluded.sku,platform_sku=excluded.platform_sku,quantity=excluded.quantity,revenue=excluded.revenue,item_price=excluded.item_price,customer_info=excluded.customer_info,is_replacement=excluded.is_replacement,status=excluded.status,shop=excluded.shop`,
      ).bind(x.orderDate,x.orderNo,x.sourceOrderNo,x.salesSku,x.platformSku,x.quantity,x.revenue,x.itemPrice,x.customerInfo,x.isReplacement?1:0,x.status || (x.isReplacement?'替换订单':'已导入'),shop)));
    }
  }
  else if (action === 'importMappings') {
    const rows = body.rows as Array<{
      platform: string;
      salesSku: string;
      systemSku: string;
      displayName?: string;
    }>;
    await d1.batch(
      rows.map((x) =>
        d1
          .prepare(
            `INSERT INTO sales_sku_mappings_v2(shop,platform,sales_sku,system_sku,display_name,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(shop,platform,sales_sku) DO UPDATE SET system_sku=excluded.system_sku,display_name=excluded.display_name,updated_at=CURRENT_TIMESTAMP`,
          )
          .bind(body.shop === 'BBB-VH-3' ? 'BBB-VH-3' : 'BBB-PB-2', x.platform, x.salesSku, x.systemSku, x.displayName || ''),
      ),
    );
  } else if (action === 'importMonitorTargets') {
    const rows=body.rows as Array<{platformSku:string;salesSku?:string;title?:string;linkUrl?:string;category?:string;keyword?:string;priority?:number}>;
    const shop=body.shop === 'BBB-VH-3' ? 'BBB-VH-3' : 'BBB-PB-2';
    for (let start=0;start<rows.length;start+=80) await d1.batch(rows.slice(start,start+80).map(x=>d1.prepare(`INSERT INTO monitor_targets(shop,platform_sku,sales_sku,title,link_url,category,keyword,priority,active,updated_at) VALUES(?,?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP) ON CONFLICT(shop,platform_sku) DO UPDATE SET sales_sku=excluded.sales_sku,title=excluded.title,link_url=excluded.link_url,category=excluded.category,keyword=excluded.keyword,priority=excluded.priority,active=1,updated_at=CURRENT_TIMESTAMP`).bind(shop,x.platformSku,x.salesSku||'',x.title||'',x.linkUrl||'',x.category||'Furniture',x.keyword||'',x.priority||1)));
  } else if (action === 'importLinkMetrics') {
    const rows=body.rows as Array<{metricDate:string;platformSku:string;linkUrl?:string;title?:string;rankPosition:number;rating:number;reviewCount:number;lowStarCount:number}>;
    const shop=body.shop === 'BBB-VH-3' ? 'BBB-VH-3' : 'BBB-PB-2';
    for (let start=0;start<rows.length;start+=80) await d1.batch(rows.slice(start,start+80).map(x=>d1.prepare(`INSERT INTO link_metrics(shop,metric_date,platform_sku,link_url,title,rank_position,rating,review_count,low_star_count,created_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(shop,metric_date,platform_sku) DO UPDATE SET link_url=excluded.link_url,title=excluded.title,rank_position=excluded.rank_position,rating=excluded.rating,review_count=excluded.review_count,low_star_count=excluded.low_star_count,created_at=CURRENT_TIMESTAMP`).bind(shop,x.metricDate,x.platformSku,x.linkUrl||'',x.title||'',x.rankPosition||0,x.rating||0,x.reviewCount||0,x.lowStarCount||0)));
  } else return Response.json({ error: 'Unknown action' }, { status: 400 });
  return Response.json({ ok: true });
}

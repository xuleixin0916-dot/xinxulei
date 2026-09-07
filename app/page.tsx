'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  ListChecks,
  Menu,
  PackageSearch,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './dashboard-view.css';
import './dashboard-view-extra.css';

type Product = {
  id: number;
  sku: string;
  name: string;
  image: string;
  cost: number;
  price: number;
  status: '正常' | '待核查' | '低利润';
  category: string;
  checked: boolean | number;
  backend?: string;
  frontend?: string;
  description?: string;
  platformSku?: string;
  linkPrefix?: string;
  upc?: string;
  margin?: number | null;
  systemSku?: string;
  variantCount?: number;
  splitStatus?: string;
  accountingCost?: number | null;
  unitProfit?: number | null;
  componentCount?: number;
};
type Task = {
  id: number;
  time: string;
  title: string;
  tag: string;
  color: string;
  completed: boolean | number;
};
type Order = {
  splitStatus?: string;
  id: number;
  orderDate: string;
  orderNo: string;
  sku?: string;
  salesSku: string;
  systemSku: string;
  quantity: number;
  revenue: number;
  status: string;
  fixedCost?: number | null;
  variableRate?: number | null;
  profit?: number | null;
  profitMargin?: number | null;
  componentCount?: number;
  sourceOrderNo?: string;
  platformSku?: string;
  customerInfo?: string;
  itemPrice?: number;
  isReplacement?: boolean | number;
};
type ProfitRow = { shop:string; salesSku:string; systemSku:string; title:string; url:string; price:number; componentCount:number; splitStatus:string; fob:number; warehouseFee:number; fixedCost:number; variableRate:number; unitProfit:number; margin:number|null };
type ProfitStats = { total:number; lowProfit:number; negative:number; averageMargin:number };
type DailySummary = { date: string; orders: number; revenue: number };
type SkuGrowth = { sku: string; qty: number; previous: number; growth: number };
type SystemSale={date:string;sku:string;quantity:number;replacementQuantity:number;orderCount:number;revenue:number;pendingAmount:number};
type DailyProfit={date:string;revenue:number;profit:number;margin:number|null};
type Mapping = {
  id: number;
  platform: string;
  salesSku: string;
  systemSku: string;
  displayName: string;
  active: number;
};
type LinkMetric = {id:number;metricDate:string;platformSku:string;linkUrl:string;title:string;rankPosition:number;rating:number;reviewCount:number;lowStarCount:number;rankChange:number;reviewDelta:number;lowStarDelta:number;ratingChange:number;previousDate?:string|null};
type LinkMetricSummary = {total:number;rankUp:number;rankDown:number;newReviews:number;alerts:number};
type MonitorTarget = {id:number;platformSku:string;salesSku:string;title:string;linkUrl:string;category:string;keyword:string;priority:number;active:number;updatedAt:string};
const bbbCategories=['Furniture','Rugs','Outdoor','Bedding','Bath','Kitchen & Dining','Decor','Organization','Lighting','Baby & Kids','Holiday & More','Sales & Deals','Inspiration'] as const;
function matchBbbCategory(title:string){
  const t=String(title||'').toLowerCase();
  const rules:[string,RegExp][]=[
    ['Rugs',/\brug|carpet|runner|doormat/],['Outdoor',/outdoor|patio|garden|gazebo|pergola|umbrella|fire pit|adirondack/],
    ['Bedding',/bedding|comforter|quilt|duvet|sheet|mattress|bedspread|pillow/],['Bath',/bath|towel|shower|toilet|vanity/],
    ['Lighting',/lighting|lamp|chandelier|pendant|sconce|lantern/],['Baby & Kids',/baby|kids|kid's|nursery|crib|toddler/],
    ['Holiday & More',/christmas|holiday|halloween|thanksgiving|easter/],['Organization',/organizer|organization|storage|shelving|rack|closet/],
    ['Decor',/decor|mirror|wall art|vase|curtain|clock|tapestry/],['Kitchen & Dining',/kitchen|dining|cookware|dinnerware|bar stool|counter stool|tableware/],
  ];
  return rules.find(([,r])=>r.test(t))?.[0]||'Furniture';
}
function titleKeyword(title:string){
  const stop=new Set('vredhom the a an and or with for of to in on by from includes include featuring features new modern stylish piece pieces pc pcs set sets pack black white gray grey brown beige blue red green navy dark light large small inch inches cm home garden furniture collection sale'.split(' '));
  return [...new Set(String(title||'').replace(/\b\d+(?:\.\d+)?(?:-|x|×)?\d*\b/gi,' ').replace(/[^a-z0-9-]+/gi,' ').split(/\s+/).filter(x=>x&&!stop.has(x.toLowerCase())&&!/^\d/.test(x)))].slice(0,8).join(' ');
}
const seed: Product[] = [
  {
    id: 1,
    sku: 'BBB-240831-01',
    name: '四季全棉绗缝床盖三件套',
    image:
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=160&q=80',
    cost: 28.6,
    price: 69.99,
    status: '正常',
    category: 'Bedding',
    checked: true,
  },
  {
    id: 2,
    sku: 'BBB-240831-02',
    name: '北欧棉麻装饰抱枕套',
    image:
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=160&q=80',
    cost: 8.2,
    price: 19.99,
    status: '待核查',
    category: 'Home Decor',
    checked: false,
  },
  {
    id: 3,
    sku: 'BBB-240831-03',
    name: '竹纤维吸水浴巾套装',
    image:
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=160&q=80',
    cost: 18.9,
    price: 36.99,
    status: '低利润',
    category: 'Bath',
    checked: false,
  },
  {
    id: 4,
    sku: 'BBB-240831-04',
    name: '可折叠床下收纳箱 2件装',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=160&q=80',
    cost: 21.4,
    price: 54.99,
    status: '正常',
    category: 'Storage',
    checked: true,
  },
];
const seedTasks: Task[] = [
  {
    id: 1,
    time: '09:30',
    title: '核查前台价格与库存',
    tag: '价格核查',
    color: '#ea6a34',
    completed: true,
  },
  {
    id: 2,
    time: '11:00',
    title: '更新 12 个新品后台链接',
    tag: '新品上架',
    color: '#466b5c',
    completed: true,
  },
  {
    id: 3,
    time: '14:30',
    title: '整理异常利润商品',
    tag: '利润复盘',
    color: '#946c3b',
    completed: false,
  },
  {
    id: 4,
    time: '16:00',
    title: '完成当日工作记录',
    tag: '日结',
    color: '#56638a',
    completed: false,
  },
];
const navGroups = [
  {label:'数据看板',icon:LayoutDashboard,children:[]},
  {label:'SKU管理',icon:PackageSearch,children:['系统产品','销售产品']},
  {label:'订单管理',icon:ShoppingCart,children:[]},
  {label:'销售分析',icon:TrendingUp,children:['销售总览','SKU销售统计','类目销售']},
  {label:'广告管理',icon:TrendingUp,children:['广告总览','SKU广告','广告记录调整']},
  {label:'利润分析',icon:CircleDollarSign,children:['利润总览','利润试算','FOB试算','SKU利润','利润模拟器']},
  {label:'促销分析',icon:TrendingUp,children:[]},
  {label:'产品表现',icon:PackageSearch,children:[]},
] as const;

export default function Home() {
  const [now, setNow] = useState(new Date());
  const [selectedShop, setSelectedShop] = useState<'BBB-PB-2' | 'BBB-VH-3'>('BBB-PB-2');
  const [selectedOrderDate, setSelectedOrderDate] = useState(new Date().toISOString().slice(0,10));
  const [dateFrom,setDateFrom]=useState(selectedOrderDate);
  const [dateTo,setDateTo]=useState(selectedOrderDate);
  const [products, setProducts] = useState(seed);
  const [tasks, setTasks] = useState(seedTasks);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [skuGrowth, setSkuGrowth] = useState<SkuGrowth[]>([]);
  const [systemSales,setSystemSales]=useState<SystemSale[]>([]);
  const [dailyProfitSummary,setDailyProfitSummary]=useState<DailyProfit[]>([]);
  const [orderSearch,setOrderSearch]=useState('');
  const [skuSearch,setSkuSearch]=useState('');
  const [salesSearch,setSalesSearch]=useState('');
  const [salesDate,setSalesDate]=useState('');
  const [profitSearch,setProfitSearch]=useState('');
  const [fobPurchase,setFobPurchase]=useState(0);
  const [fobMargin,setFobMargin]=useState(0.2);
  const [fobLogistics,setFobLogistics]=useState(6000);
  const [fobTax,setFobTax]=useState(0);
  const [fobTaxDivisor,setFobTaxDivisor]=useState(1);
  const [fobRate,setFobRate]=useState(7.2);
  const fobResult=(fobPurchase*(1+fobMargin)+fobLogistics-(fobPurchase*fobTax/100)/Math.max(fobTaxDivisor,1))/Math.max(fobRate,0.01);
  const [mappingSearch,setMappingSearch]=useState('');
  const [monitorSearch,setMonitorSearch]=useState('');
  const [unresolvedOrders,setUnresolvedOrders]=useState(0);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [allProfitCatalog, setProfitCatalog] = useState<ProfitRow[]>([]);
  const profitCatalog=allProfitCatalog.filter(p=>`${p.salesSku} ${p.systemSku} ${p.title}`.toLowerCase().includes(profitSearch.toLowerCase()));
  const [profitStats, setProfitStats] = useState<ProfitStats>({total:0,lowProfit:0,negative:0,averageMargin:0});
  const [allLinkMetrics,setLinkMetrics]=useState<LinkMetric[]>([]);
  const linkMetrics=allLinkMetrics.filter(m=>`${m.platformSku} ${m.title}`.toLowerCase().includes(monitorSearch.toLowerCase()));
  const [linkMetricSummary,setLinkMetricSummary]=useState<LinkMetricSummary>({total:0,rankUp:0,rankDown:0,newReviews:0,alerts:0});
  const [monitorTargets,setMonitorTargets]=useState<MonitorTarget[]>([]);
  const [targetText,setTargetText]=useState('');
  const [metricText,setMetricText]=useState('');
  const [metricDate,setMetricDate]=useState(new Date().toLocaleDateString('en-CA',{timeZone:'America/Denver'}));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'全部' | '待核查' | '低利润'>('全部');
  const [showAdd, setShowAdd] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [view,setView]=useState('dashboard');
  const inRange=(date:string)=>date>=dateFrom&&date<=dateTo;
  const [trendRange,setTrendRange]=useState<'7d'|'30d'|'lastMonth'|'custom'>('7d');
  const trendData=useMemo(()=>{const rows=dailyProfitSummary.map(x=>({...x,orders:dailySummary.find(d=>d.date===x.date)?.orders||0}));if(trendRange==='7d')return rows.slice(-7);if(trendRange==='30d')return rows.slice(-30);if(trendRange==='lastMonth'){const m=new Date();m.setMonth(m.getMonth()-1);const key=m.toISOString().slice(0,7);return rows.filter(x=>x.date.startsWith(key));}return rows.filter(x=>x.date>=dateFrom&&x.date<=dateTo);},[dailyProfitSummary,dailySummary,trendRange,dateFrom,dateTo]);
  const distribution=useMemo(()=>{const map=new Map<string,number>();systemSales.filter(x=>inRange(x.date)).forEach(x=>map.set(x.sku,(map.get(x.sku)||0)+x.quantity));return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value}));},[systemSales,dateFrom,dateTo]);
  const rangeProfit=dailyProfitSummary.filter(x=>inRange(x.date));
  const rangeSales=dailySummary.filter(x=>inRange(x.date));
  const rangeRevenue=rangeProfit.reduce((s,x)=>s+Number(x.revenue||0),0)||rangeSales.reduce((s,x)=>s+Number(x.revenue||0),0);
  const rangeUnits=systemSales.filter(x=>inRange(x.date)).reduce((s,x)=>s+x.quantity,0);
  const rangeMargin=rangeProfit.length?rangeProfit.reduce((s,x)=>s+Number(x.margin||0)*Number(x.revenue||0),0)/Math.max(rangeRevenue,1):profitStats.averageMargin;
  const [notice, setNotice] = useState('');
  const [completedText, setCompletedText] = useState('');
  const [followupText, setFollowupText] = useState('');
  const [importText, setImportText] = useState('');
  const [online, setOnline] = useState(false);
  const loadData = (shop = selectedShop, orderDate = selectedOrderDate) =>
    fetch(`/api/data?shop=${shop}&orderDate=${orderDate}`)
      .then((r) => r.json() as Promise<Record<string, any>>)
      .then((d) => {
        setProducts(d.products);
        setTasks(d.tasks.length ? d.tasks : seedTasks);
        setCompletedText(d.log.completedText || '');
        setFollowupText(d.log.followupText || '');
        setOrders(d.allOrders || d.orders || []);
        setDailySummary(d.dailySummary || []);
        setSkuGrowth(d.skuGrowth || []);
        setSystemSales(d.systemSales || []);
        setDailyProfitSummary(d.dailyProfitSummary || []);
        setUnresolvedOrders(d.unresolvedOrders || 0);
        setMappings(d.mappings || []);
        setProfitCatalog(d.profitCatalog || []);
        setProfitStats(d.profitStats || {total:0,lowProfit:0,negative:0,averageMargin:0});
        setLinkMetrics(d.linkMetrics || []);
        setLinkMetricSummary(d.linkMetricSummary || {total:0,rankUp:0,rankDown:0,newReviews:0,alerts:0});
        setMonitorTargets(d.monitorTargets || []);
        setOnline(true);
      })
      .catch(() => setOnline(false));
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    loadData();
    return () => clearInterval(id);
  }, []);
  const filtered = useMemo(
    () =>
      products
        .filter((p) =>
          `${p.name}${p.sku}${p.systemSku || ''}${p.platformSku || ''}${p.linkPrefix || ''}${p.upc || ''}${p.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .filter(
          (p) =>
            filter === '全部' ||
            (filter === '待核查' ? !p.checked : p.status === '低利润'),
        ),
    [products, query, filter],
  );
  const checked = products.filter((p) => p.checked).length;
  const ping = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(''), 2200);
  };
  const goTo = (label: string) => {
    if(label==='订单管理' && dateFrom===dateTo){ setDateFrom('2020-01-01'); setDateTo(new Date().toISOString().slice(0,10)); }
    const target: Record<string,string> = {
      '数据看板':'dashboard-metrics','销售总览':'orders-section','SKU销售统计':'system-sales','SKU销售':'system-sales',
      '订单管理':'orders-section','系统产品':'product-library','商品库':'product-library','销售产品':'sku-mapping','SKU映射':'sku-mapping',
      '利润总览':'profit-overview','利润试算':'profit-overview','SKU利润':'profit-overview','利润模拟器':'profit-overview','FOB试算':'fob-calculator',
      '产品表现':'link-monitor','促销分析':'orders-section','广告总览':'orders-section','SKU广告':'orders-section','广告记录调整':'orders-section','类目销售':'system-sales','日历与日程':'schedule','每日工作记录':'daily-log',
    };
    const viewMap:Record<string,string>={'数据看板':'dashboard','订单管理':'orders','销售总览':'orders','SKU销售统计':'system-sales','SKU销售':'system-sales','系统产品':'product-library','商品库':'product-library','销售产品':'sku-mapping','SKU映射':'sku-mapping','利润总览':'profit-overview','利润试算':'profit-overview','SKU利润':'profit-overview','利润模拟器':'profit-overview','FOB试算':'fob','产品表现':'link-monitor','日历与日程':'schedule','每日工作记录':'daily-log'};
    if(!viewMap[label]) { setView('dashboard'); if(navGroups.some(g=>g.label===label&&g.children.length)) ping('请从展开的子菜单进入具体看板'); else ping(`${label}模块正在建设中`); return; }
    setView(viewMap[label]);
    const el=document.getElementById(target[label]);
    if(el){el.scrollIntoView({behavior:'smooth',block:'start'});setSidebar(false);return;}
  };
  const post = (data: Record<string, unknown>) =>
    fetch('/api/data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  function addProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      cost = Number(f.get('cost')),
      price = Number(f.get('price')),
      product: Product = {
        id: Date.now(),
        sku: String(f.get('sku')),
        name: String(f.get('name')),
        image:
          String(f.get('image')) ||
          'https://images.unsplash.com/photo-1583845112203-29329902330b?auto=format&fit=crop&w=160&q=80',
        cost,
        price,
        status: price > cost * 2 ? '正常' : '低利润',
        category: String(f.get('category')),
        checked: false,
        backend: String(f.get('backend')),
        frontend: String(f.get('frontend')),
        description: String(f.get('description')),
      };
    setProducts((v) => [product, ...v]);
    post({ action: 'addProduct', ...product });
    setShowAdd(false);
    ping('商品已保存并加入核查清单');
  }
  function addTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      task: Task = {
        id: Date.now(),
        time: String(f.get('time')),
        title: String(f.get('title')),
        tag: String(f.get('tag')),
        color: '#466b5c',
        completed: false,
      };
    setTasks((v) => [...v, task].sort((a, b) => a.time.localeCompare(b.time)));
    post({ action: 'addTask', ...task });
    setShowTask(false);
    ping('新日程已保存');
  }
  function saveLog() {
    post({ action: 'saveLog', completedText, followupText });
    ping('今日工作记录已保存到云端');
  }
  async function addOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      quantity = Number(f.get('quantity')),
      unitPrice = Number(f.get('unitPrice')),
      salesSku = String(f.get('sku'));
    await post({
      action: 'addOrder',
      shop: selectedShop,
      orderDate: f.get('orderDate'),
      orderNo: f.get('orderNo'),
      sku: salesSku,
      quantity,
      revenue: Number((quantity * unitPrice).toFixed(2)),
      status: f.get('status'),
    });
    setShowOrder(false);
    await loadData();
    ping('订单已按销售 SKU 录入并映射到系统 SKU');
  }
  function parseCsv(text: string) {
    const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = false; else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
    return rows;
  }
  async function importOrderFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const parsed = parseCsv((await file.text()).replace(/^\uFEFF/, ''));
    const headers = parsed[0] || []; const col = (name: string) => headers.indexOf(name);
    const required = ['Retailer Order Number','Created Date','Supplier SKU','Quantity','SOFS SKU','Retailer First Cost','Item Price'];
    if (required.some((x) => col(x) < 0)) { ping('订单文件缺少必要字段'); e.target.value=''; return; }
    const rows: Array<Record<string, unknown>> = [];
    for (const values of parsed.slice(1)) {
      const sourceOrderNo = values[col('Retailer Order Number')]?.trim();
      const salesSku = values[col('Supplier SKU')]?.trim();
      const quantity = Math.max(1, Number(values[col('Quantity')]) || 1);
      if (!sourceOrderNo || !salesSku) continue;
      const itemPrice = Number(values[col('Item Price')]) || 0;
      const get = (name:string) => values[col(name)]?.trim() || '';
      const customerInfo = [
        `姓名：${get('Ship Contact Name') || '—'}`,
        `电话：${get('Ship Phone') || '—'}`,
        `国家：${get('Ship Country Code') || '—'}`,
        `州：${get('Ship State Or Province') || '—'}`,
        `城市：${get('Ship City') || '—'}`,
        `地址：${[get('Ship Address 1'),get('Ship Postal Code')].filter(Boolean).join('，') || '—'}`,
      ].join('｜');
      for (let n=1;n<=quantity;n++) rows.push({
        sourceOrderNo, orderNo: quantity > 1 ? `${sourceOrderNo}-${n}` : sourceOrderNo,
        orderDate: (values[col('Created Date')] || '').slice(0,10), salesSku,
        platformSku: values[col('SOFS SKU')]?.trim() || '', quantity: 1,
        revenue: Number(values[col('Retailer First Cost')]) || 0, itemPrice,
        customerInfo, isReplacement: itemPrice === 0, status: itemPrice === 0 ? '替换订单' : '已导入',
      });
    }
    if (!rows.length) { ping('未识别到有效订单'); e.target.value=''; return; }
    await post({action:'importOrders',shop:selectedShop,rows}); const importedDate=String(rows[0].orderDate); setSelectedOrderDate(importedDate); await loadData(selectedShop,importedDate);
    const replacements = rows.filter((x)=>x.isReplacement).length;
    ping(`已导入 ${rows.length} 条拆分订单${replacements ? `，其中 ${replacements} 条替换订单` : ''}`); e.target.value='';
  }
  async function importMappings() {
    const lines = importText.trim().split(/\r?\n/).filter(Boolean);
    const start = lines[0]?.toLowerCase().includes('sales_sku') ? 1 : 0;
    const rows = lines
      .slice(start)
      .map((line) => {
        const [platform, salesSku, systemSku, displayName = ''] = line
          .split(',')
          .map((x) => x.trim().replace(/^"|"$/g, ''));
        return { platform, salesSku, systemSku, displayName };
      })
      .filter((x) => x.platform && x.salesSku && x.systemSku);
    if (!rows.length) {
      ping('未识别到有效映射数据');
      return;
    }
    await post({ action: 'importMappings', rows, shop: selectedShop });
    setShowImport(false);
    setImportText('');
    await loadData();
    ping(`已导入 ${rows.length} 条销售 SKU 映射`);
  }
  async function importLinkMetrics() {
    const lines=metricText.trim().split(/\r?\n/).filter(Boolean); const start=lines[0]?.toLowerCase().includes('sku')?1:0;
    const productByPlatform=new Map(products.map(p=>[p.platformSku,p]));
    const rows=lines.slice(start).map(line=>{
      const [platformSku,rank,rating,reviews,lowStars]=line.split(',').map(x=>x.trim().replace(/^"|"$/g,'')); const p=productByPlatform.get(platformSku);
      return {metricDate,platformSku,rankPosition:Number(rank)||0,rating:Number(rating)||0,reviewCount:Number(reviews)||0,lowStarCount:Number(lowStars)||0,linkUrl:p?.frontend||'',title:p?.name||''};
    }).filter(x=>x.platformSku);
    if(!rows.length){ping('未识别到有效排名数据');return;}
    await post({action:'importLinkMetrics',shop:selectedShop,rows}); setMetricText(''); await loadData(); ping(`已更新 ${rows.length} 条链接监控数据`);
  }
  async function importMonitorTargets(){
    const lines=targetText.trim().split(/\r?\n/).filter(Boolean); const start=lines[0]?.toLowerCase().includes('sku')?1:0;
    const rows=lines.slice(start).map(line=>{
      const [identifier,customKeyword='',customCategory='',priority='1']=line.split(',').map(x=>x.trim().replace(/^"|"$/g,''));
      const p=products.find(x=>x.platformSku===identifier||x.sku===identifier);
      if(!p?.platformSku)return null;
      const category=bbbCategories.includes(customCategory as typeof bbbCategories[number])?customCategory:matchBbbCategory(p.name);
      return {platformSku:p.platformSku,salesSku:p.sku,title:p.name,linkUrl:p.frontend||'',category,keyword:customKeyword||titleKeyword(p.name),priority:Number(priority)||1};
    }).filter(Boolean);
    if(!rows.length){ping('未找到可匹配的平台 SKU 或销售 SKU');return;}
    await post({action:'importMonitorTargets',shop:selectedShop,rows});setTargetText('');await loadData();ping(`已更新 ${rows.length} 个重点 SKU 监控目标`);
  }
  function exportCsv() {
    const head = [
      'SKU',
      '商品名称',
      '分类',
      '批发价',
      '前台价',
      '利润率',
      '状态',
      '后台链接',
      '前台链接',
      '描述',
    ];
    const rows = products.map((p) => [
      p.sku,
      p.name,
      p.category,
      p.cost,
      p.price,
      `${(((p.price - p.cost) / p.price) * 100).toFixed(1)}%`,
      p.status,
      p.backend || '',
      p.frontend || '',
      p.description || '',
    ]);
    const csv =
      '\uFEFF' +
      [head, ...rows]
        .map((r) =>
          r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(','),
        )
        .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `BeyondDesk-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    ping('商品数据已导出');
  }
  return (
    <main className={`app-shell view-${view}`}>
      <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">B</span>
          <div>
            <strong>Beyond Desk</strong>
            <small>跨境运营工作台</small>
          </div>
          <button
            className="close-mobile"
            onClick={() => setSidebar(false)}
            aria-label="关闭菜单"
          >
            <X size={20} />
          </button>
        </div>
        <nav>
          <p>运营中心</p>
          {navGroups.map(({icon:Icon,label,children},i) => <div className="nav-group" key={label}>
            <button className={i===0?'active':''} onClick={() => goTo(label)}><Icon size={17}/>{label}{children.length>0&&<ChevronDown size={13} className="nav-chevron"/>}{label==='SKU管理'&&<em>2</em>}</button>
            {children.length>0&&<div className="nav-children">{children.map(child=><button key={child} onClick={()=>goTo(child)}>{child}</button>)}</div>}
          </div>)}
          <div className="nav-group"><button onClick={()=>goTo('日历与日程')}><CalendarDays size={17}/>日历与日程</button></div>
          <div className="nav-group"><button onClick={()=>goTo('每日工作记录')}><ListChecks size={17}/>每日工作记录</button></div>
          <p>系统</p>
          <button onClick={() => ping('设置模块将在下一版开放')}>
            <Settings size={18} />
            设置
          </button>
        </nav>
        <div className="sidebar-card">
          <span>
            <Check size={15} />
          </span>
          <strong>今日完成度</strong>
          <b>{Math.round((checked / products.length) * 100)}%</b>
          <div>
            <i style={{ width: `${(checked / products.length) * 100}%` }} />
          </div>
          <small>
            {checked} / {products.length} 项核查完成
          </small>
        </div>
        <div className="profile">
          <span>YL</span>
          <div>
            <strong>运营负责人</strong>
            <small>中国 · 上海</small>
          </div>
          <ChevronDown size={16} />
        </div>
      </aside>
      {sidebar && (
        <button
          className="scrim"
          onClick={() => setSidebar(false)}
          aria-label="关闭菜单"
        />
      )}
      <section className="workspace">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setSidebar(true)}
            aria-label="打开菜单"
          >
            <Menu />
          </button>
          <div className="search">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索商品、SKU 或工作记录..."
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className="top-actions">
            <button aria-label="通知">
              <Bell size={20} />
              <i />
            </button>
            <span className="sync">
              <i className={online ? '' : 'offline'} />
              {online ? '云端已同步' : '正在连接'}
            </span>
            <button className="export-button" onClick={exportCsv}>
              <Download size={17} />
              导出
            </button>
            <button className="add-button" onClick={() => setShowAdd(true)}>
              <Plus size={18} />
              录入商品
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p>BED BATH &amp; BEYOND · 日常运营</p>
              <h1>早上好，今天继续把细节做好。</h1>
            </div>
            <div className="shop-switcher" aria-label="店铺切换">
              {(['BBB-PB-2', 'BBB-VH-3'] as const).map(shop => <button key={shop} className={selectedShop === shop ? 'selected' : ''} onClick={() => { setSelectedShop(shop); loadData(shop); }}>{shop}</button>)}
            </div>
            <div className="time-zones"><div className="live-time">
              <span>
                <Clock3 size={16} />
                上海时间
              </span>
              <strong>
                {now.toLocaleTimeString('zh-CN', { hour12: false })}
              </strong>
              <small>
                {now.toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </small>
            </div><div className="live-time mountain-time"><span><Clock3 size={16}/>美国山地时间</span><strong>{now.toLocaleTimeString('en-US',{timeZone:'America/Denver',hour12:false})}</strong><small>{now.toLocaleDateString('zh-CN',{timeZone:'America/Denver',year:'numeric',month:'long',day:'numeric',weekday:'long'})}</small></div></div>
          </div>
          <div className="dashboard-range-filter"><span>看板时间范围</span><label>从<input type="date" value={dateFrom} onChange={e=>{const v=e.target.value;setDateFrom(v);if(v>dateTo)setDateTo(v);loadData(selectedShop,v)}}/></label><label>至<input type="date" value={dateTo} onChange={e=>{const v=e.target.value;setDateTo(v);loadData(selectedShop,v)}}/></label></div>
          <section data-page-panel="home" id="dashboard-metrics" className="metrics dashboard-metrics">
            <article>
              <span className="metric-icon orange">
                <CircleDollarSign />
              </span>
              <div>
                <small>今日销售额</small>
                <strong>${rangeRevenue.toFixed(2)}</strong>
                <p><b>较昨日</b> {(()=>{const t=dailyProfitSummary.find(x=>x.date===selectedOrderDate)?.revenue||0;const ds=dailyProfitSummary.filter(x=>x.date<selectedOrderDate).sort((a,b)=>b.date.localeCompare(a.date))[0]?.revenue||0;return ds?`${t>=ds?'+':''}${((t-ds)/ds*100).toFixed(1)}%`:'—'})()}</p>
              </div>
            </article>
            <article>
              <span className="metric-icon green">
                <ShoppingCart />
              </span>
              <div>
                <small>今日销量</small>
                <strong>{rangeUnits}</strong>
                <p><b>系统 SKU</b> 拆分后统计</p>
              </div>
            </article>
            <article>
              <span className="metric-icon blue">
                <CircleDollarSign />
              </span>
              <div>
                <small>平均利润率</small>
                <strong>{(rangeMargin*100).toFixed(1)}%</strong>
                <p><b>较昨日</b> {(()=>{const t=dailyProfitSummary.find(x=>x.date===selectedOrderDate)?.margin;const y=dailyProfitSummary.filter(x=>x.date<selectedOrderDate&&x.margin!=null).sort((a,b)=>b.date.localeCompare(a.date))[0]?.margin;return t!=null&&y!=null?`${t>=y?'+':''}${((t-y)*100).toFixed(1)} 个百分点`:'—'})()}</p>
              </div>
            </article>
            <article>
              <span className="metric-icon blue">
                <TrendingUp />
              </span>
              <div>
                <small>SKU 表现</small>
                <strong>{skuGrowth[0]?.sku||'—'}</strong>
                <p><b>{skuGrowth[0]?`${skuGrowth[0].growth>=0?'+':''}${skuGrowth[0].growth}%`:''}</b> 较昨日变化</p>
              </div>
            </article>
          </section>
          <section data-page-panel="home" className="insight-strip">
            <div className="panel-title"><div><small>DAILY INTELLIGENCE</small><h2>销售与利润经营诊断</h2></div><span>{selectedShop} · {dateFrom} 至 {dateTo}</span></div>
            <div className="insight-grid">
              <article className="insight-card"><span className="insight-label">销售</span><strong>{Number(dailyProfitSummary.find(x=>x.date===selectedOrderDate)?.revenue||0)>0?'保持高潜 SKU 库存与曝光':'等待订单数据'}</strong><p>基于所选店铺与日期的销售额、销量及 SKU 增幅自动生成。</p></article>
              <article className="insight-card"><span className="insight-label">利润</span><strong>{(Number(dailyProfitSummary.find(x=>x.date===selectedOrderDate)?.margin||profitStats.averageMargin)*100)<10?'优先检查低利润 SKU 的 FOB 与广告费':'关注利润率波动 SKU'}</strong><p>利润率低于 10% 的 SKU 会进入利润试算复核清单。</p></article>
              <article className="insight-card"><span className="insight-label">广告</span><strong>广告数据待导入</strong><p>导入每日广告花费、曝光、点击、订单后，将自动计算 ACOS、ROAS、CTR，并给出预算增减建议。</p></article>
            </div>
          </section>
          <section data-page-panel="orders" id="orders-section" className="orders-section" style={{display:view==='orders'?'block':undefined}}>
            <div className="orders-heading">
              <div>
                <p>SALES OVERVIEW</p>
                <h2>订单管理 · 经营总览</h2>
              </div>
              <div className="date-range-filter"><label>开始日期<input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);if(e.target.value>dateTo)setDateTo(e.target.value)}}/></label><label>结束日期<input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label></div>
              <button className="add-button" onClick={() => setShowOrder(true)}>
                <Plus size={17} />
                录入订单
              </button>
              <label className="order-import-button"><Upload size={16}/>导入订单 CSV<input type="file" accept=".csv,text/csv" onChange={importOrderFile}/></label>
            </div>
            <div className="order-kpis">
              <article>
                <span>
                  <ShoppingCart size={18} />
                </span>
                <div>
                  <small>所选日原始订单数</small>
                  <strong>
                    {new Set(orders.filter(o=>inRange(o.orderDate)).map(o=>o.sourceOrderNo||o.orderNo)).size}
                  </strong>
                </div>
              </article>
              <article><span><CircleDollarSign size={18}/></span><div><small>替换订单</small><strong>{orders.filter(o=>inRange(o.orderDate)&&o.isReplacement).length}</strong><em>需优先核查</em></div></article>
              <article>
                <span>
                  <CircleDollarSign size={18} />
                </span>
                <div>
                  <small>所选日原订单销售额</small>
                  <strong>
                    $
                    {rangeRevenue.toFixed(2)}
                  </strong>
                </div>
              </article>
              <article>
                <span>
                  <TrendingUp size={18} />
                </span>
                <div>
                  <small>所选日销量最高系统 SKU</small>
                  <strong>{skuGrowth[0]?.sku || '—'}</strong>
                  <em>
                    {skuGrowth[0]
                      ? `${skuGrowth[0].growth >= 0 ? '+' : ''}${skuGrowth[0].growth}%`
                      : '暂无'}
                  </em>
                </div>
              </article>
            </div>
            <div className="analytics-grid">
              <article className="panel chart-card">
                <div className="chart-title">
                  <div>
                    <small>SALES TREND</small>
                    <h3>销售趋势</h3>
                  </div>
                  <div className="trend-tabs">{[['7d','近七日'],['30d','近三十日'],['lastMonth','上月'],['custom','自定义']].map(([k,n])=><button key={k} className={trendRange===k?'active':''} onClick={()=>setTrendRange(k as any)}>{n}</button>)}</div>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData}
                      margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ecece6" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) => String(v).slice(5)}
                        tick={{ fontSize: 9, fill: '#7b8580' }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 9, fill: '#7b8580' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 9, fill: '#7b8580' }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e3e4df',
                          fontSize: 10,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="orders"
                        name="订单量"
                        stroke="#2f6b58"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="revenue"
                        name="销售额($)"
                        stroke="#e5763d"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
              <article className="panel chart-card distribution-card"><div className="chart-title"><div><small>SALES MIX</small><h3>销售分布</h3></div><span>系统 SKU</span></div><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>{distribution.map((_,i)=><Cell key={i} fill={['#2f6b58','#e5763d','#4d8f78','#d6a15d','#7899a5','#8d7d9c'][i]}/>)}</Pie><Tooltip/><Legend wrapperStyle={{fontSize:9}}/></PieChart></ResponsiveContainer></div></article>
              <article className="panel chart-card">
                <div className="chart-title">
                  <div>
                    <small>SKU GROWTH</small>
                    <h3>SKU 表现</h3>
                  </div>
                  <input aria-label="搜索对比系统SKU" placeholder="搜索系统 SKU" value={skuSearch} onChange={e=>setSkuSearch(e.target.value)}/>
                </div>
                <div className="chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={skuGrowth.filter(x=>x.sku.toLowerCase().includes(skuSearch.toLowerCase())).slice(0,20)}
                      margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ecece6" />
                      <XAxis
                        dataKey="sku"
                        tickFormatter={(v) => String(v)}
                        tick={{ fontSize: 9, fill: '#7b8580' }}
                      />
                      <YAxis tick={{ fontSize: 9, fill: '#7b8580' }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e3e4df',
                          fontSize: 10,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar
                        dataKey="previous"
                        name="昨日"
                        fill="#cfdad5"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="qty"
                        name="今日"
                        fill="#3b7562"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>
            <article className="panel daily-orders">
              <div className="panel-title">
                <div>
                  <small>DAILY ORDERS</small>
                  <h2>订单明细 · 按系统 SKU 拆分</h2>
                </div>
                <span>{orders.filter(o=>inRange(o.orderDate)).length} 条记录</span>
              </div>
              <input aria-label="搜索订单" placeholder="搜索订单号 / 销售 SKU / 系统 SKU / 平台 SKU / 客户" value={orderSearch} onChange={e=>setOrderSearch(e.target.value)}/>
              <p className="mapping-note">每条为一件系统 SKU，组合内数量 × 订单数量；金额按子 SKU FOB 分摊。{unresolvedOrders>0?`${unresolvedOrders} 条原订单缺少映射，尚未计入系统 SKU 销量。`:''}</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>订单号</th>
                    <th>平台销售 SKU</th>
                      <th>固定系统 SKU</th>
                      <th>平台 SKU</th>
                      <th>数量</th>
                      <th>销售额</th>
                      <th>实时利润</th>
                      <th>利润率</th>
                      <th>客户信息</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.filter(o=>inRange(o.orderDate)&&`${o.orderNo} ${o.salesSku} ${o.systemSku} ${o.platformSku} ${o.customerInfo}`.toLowerCase().includes(orderSearch.toLowerCase())).map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.orderNo}</strong>
                          <small>{o.orderDate}</small>
                        </td>
                      <td>{o.salesSku || o.sku}</td>
                      <td><b className={o.systemSku.includes('未映射') ? 'low' : ''}>{o.systemSku}</b><small>{o.splitStatus}</small></td>
                        <td>{o.platformSku || '—'}</td>
                        <td>{o.quantity}</td>
                        <td>
                          <strong>{o.revenue==null?'待补 FOB':`$${Number(o.revenue).toFixed(2)}`}</strong>
                        </td>
                        <td><strong className={Number(o.profit) < 0 ? 'low' : ''}>{o.profit == null ? '待匹配' : `$${Number(o.profit).toFixed(2)}`}</strong></td>
                        <td><span className={`profit-pill ${Number(o.profitMargin) < 0.1 ? 'danger' : ''}`}>{o.profitMargin == null ? '—' : `${(Number(o.profitMargin) * 100).toFixed(1)}%`}</span></td>
                        <td><span className="customer-cell" title={o.customerInfo}>{o.customerInfo ? o.customerInfo.split('｜').map((part)=><small key={part}>{part}</small>) : '—'}</span></td>
                        <td>
                          <span className={`status ${o.isReplacement ? '替换订单' : '正常'}`}>{o.isReplacement ? '⚠ 替换订单' : o.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!orders.length && (
                  <div className="empty">
                    今天还没有订单，点击“录入订单”开始记录
                  </div>
                )}
              </div>
            </article>
          </section>
          <section data-page-panel="system-sales" id="system-sales" className="panel profit-panel">
            <div className="panel-title"><div><small>SYSTEM SKU SALES</small><h2>SKU 销售统计</h2></div><span>{systemSales.filter(x=>(!salesDate||x.date===salesDate)&&x.sku.toLowerCase().includes(salesSearch.toLowerCase())).reduce((s,x)=>s+x.quantity,0)} 件</span></div>
            <div className="metric-import"><label>日期（留空显示全部）<input type="date" value={salesDate} onChange={e=>setSalesDate(e.target.value)}/></label><input aria-label="搜索销量系统SKU" placeholder="搜索系统 SKU" value={salesSearch} onChange={e=>setSalesSearch(e.target.value)}/></div>
            <p className="mapping-note">按店铺、订单日期、固定系统 SKU 汇总；总量包含替换订单，替换数量单独列出。未映射订单不混入销量。</p>
            <div className="target-chips">{[...new Set(systemSales.map(x=>x.date))].filter(d=>!salesDate||d===salesDate).map(d=><span key={d}><b>{d} · 系统 SKU 总量</b>{systemSales.filter(x=>x.date===d&&x.sku.toLowerCase().includes(salesSearch.toLowerCase())).reduce((s,x)=>s+x.quantity,0)} 件</span>)}</div>
            <div className="table-wrap"><table><thead><tr><th>订单日期</th><th>系统 SKU</th><th>总数量</th><th>正常数量</th><th>替换数量</th><th>原订单数</th><th>分摊销售额</th></tr></thead><tbody>{systemSales.filter(x=>(!salesDate||x.date===salesDate)&&x.sku.toLowerCase().includes(salesSearch.toLowerCase())).map(x=><tr key={`${x.date}-${x.sku}`}><td>{x.date}</td><td><strong>{x.sku}</strong></td><td>{x.quantity}</td><td>{x.quantity-x.replacementQuantity}</td><td>{x.replacementQuantity}</td><td>{x.orderCount}</td><td>${x.revenue.toFixed(2)}{x.pendingAmount>0&&<small className="low">另有 {x.pendingAmount} 件金额待核查</small>}</td></tr>)}</tbody></table>{!systemSales.length&&<div className="empty">暂无可统计的系统 SKU</div>}</div>
          </section>
          <section data-page-panel="profit" id="profit-overview" className="panel profit-panel">
            <div className="panel-title">
              <div><small>REAL-TIME PROFIT</small><h2>利润试算</h2></div>
              <span>{profitStats.total} 个在售销售 SKU</span>
            </div>
            <div className="profit-summary">
              <div><small>平均利润率</small><strong>{(profitStats.averageMargin*100).toFixed(1)}%</strong></div>
              <div><small>低于 10%</small><strong>{profitStats.lowProfit}</strong></div>
              <div><small>负利润</small><strong className="low">{profitStats.negative}</strong></div>
              <div><small>当前展示</small><strong>{profitCatalog.length}</strong></div>
            </div>
            <p className="mapping-note">已按良仓库内费、FOB、关税、海运分摊及各项费率计算；组合产品按固定系统 SKU 拆分。</p>
            <input aria-label="搜索利润核算" placeholder="搜索销售 SKU / 系统 SKU / 标题" value={profitSearch} onChange={e=>setProfitSearch(e.target.value)}/>
            <div className="table-wrap"><table><thead><tr><th>销售 SKU</th><th>固定系统 SKU / 组合</th><th>售价</th><th>FOB</th><th>固定成本</th><th>变动费率</th><th>单件利润</th><th>利润率</th></tr></thead><tbody>
              {profitCatalog.map(p => <tr key={`${p.shop}-${p.salesSku}`}><td><strong>{p.salesSku}</strong><small className="cell-note">{p.title}</small></td><td><span className="system-sku">{p.systemSku || '未映射'}</span>{p.componentCount > 1 && <small className="combo-badge">{p.componentCount} 个组件</small>}</td><td>${Number(p.price).toFixed(2)}</td><td>${Number(p.fob).toFixed(2)}</td><td>${Number(p.fixedCost).toFixed(2)}</td><td>{(Number(p.variableRate)*100).toFixed(1)}%</td><td><strong className={Number(p.unitProfit)<0?'low':''}>${Number(p.unitProfit).toFixed(2)}</strong></td><td><span className={`profit-pill ${Number(p.margin)<0.1?'danger':''}`}>{p.margin == null?'—':`${(Number(p.margin)*100).toFixed(1)}%`}</span></td></tr>)}
            </tbody></table></div>
          </section>
          <section data-page-panel="fob" id="fob-calculator" className="panel profit-panel fob-panel">
            <div className="panel-title"><div><small>FOB CALCULATOR</small><h2>FOB 试算</h2></div><span>实时计算</span></div>
            <p className="mapping-note">按采购人民币价格、目标利润率、物流成本、退税率与汇率估算 FOB 价格。</p>
            <div className="fob-grid">
              <label>采购人民币价格<input type="number" min="0" value={fobPurchase} onChange={e=>setFobPurchase(Number(e.target.value))}/></label>
              <label>目标利润率（%）<input type="number" min="0" step="0.1" value={fobMargin*100} onChange={e=>setFobMargin(Number(e.target.value)/100)}/></label>
              <label>物流成本（人民币）<input type="number" min="0" value={fobLogistics} onChange={e=>setFobLogistics(Number(e.target.value))}/></label>
              <label>退税率（%）<input type="number" min="0" step="0.1" value={fobTax} onChange={e=>setFobTax(Number(e.target.value))}/></label>
              <label>退税计算除数<input type="number" min="0.01" step="0.01" value={fobTaxDivisor} onChange={e=>setFobTaxDivisor(Number(e.target.value))}/></label>
              <label>汇率<input type="number" min="0.01" step="0.01" value={fobRate} onChange={e=>setFobRate(Number(e.target.value))}/></label>
            </div>
            <div className="fob-result"><small>试算 FOB 价格</small><strong>${fobResult.toFixed(2)}</strong><span>公式： (利润率×采购价 + 采购价 + 物流成本 − 采购价×退税率÷除数) ÷ 汇率</span></div>
          </section>
          <section data-page-panel="monitor" id="link-monitor" className="panel monitor-panel">
            <input aria-label="搜索监控链接" placeholder="搜索平台 SKU / 标题" value={monitorSearch} onChange={e=>setMonitorSearch(e.target.value)}/>
            <div className="panel-title"><div><small>LINK MONITOR · REAL-TIME FEEDBACK</small><h2>链接排名、评分与 Review 监控</h2></div><span>{linkMetricSummary.total} 条链接</span></div>
            <div className="monitor-summary">
              <div><small>排名上升</small><strong className="trend-up">↑ {linkMetricSummary.rankUp}</strong></div>
              <div><small>排名下降</small><strong className="low">↓ {linkMetricSummary.rankDown}</strong></div>
              <div><small>新增 Review</small><strong>+{linkMetricSummary.newReviews}</strong></div>
              <div><small>三星以下差评提醒</small><strong className={linkMetricSummary.alerts?'low':''}>{linkMetricSummary.alerts}</strong></div>
            </div>
            <div className="target-import"><div><strong>重点 SKU 监控目标</strong><small>已启用 {monitorTargets.filter(x=>x.active).length} 个；同一平台 SKU 再次导入会直接更新</small></div><textarea value={targetText} onChange={e=>setTargetText(e.target.value)} placeholder={'销售SKU或平台SKU,核心关键词(可空),BBB类目(可空),优先级\nVH-SKU-001,,,1'}/><button onClick={importMonitorTargets}><PackageSearch size={15}/>导入重点 SKU</button></div>
            {!!monitorTargets.length&&<div className="target-chips">{monitorTargets.slice(0,12).map(t=><span key={t.id}><b>{t.platformSku}</b>{t.category}<small>{t.keyword}</small></span>)}</div>}
            <div className="metric-import"><label>监控日期<input type="date" value={metricDate} onChange={e=>setMetricDate(e.target.value)}/></label><textarea value={metricText} onChange={e=>setMetricText(e.target.value)} placeholder={'平台SKU,排名,评分,Review数量,三星以下差评数\n38965592-000-001,25,4.4,128,3'}/><button onClick={importLinkMetrics}><Upload size={15}/>批量更新并对比</button></div>
            <p className="mapping-note">标题会自动匹配 BBB 顶部类目并提取核心关键词；无痕采集按“类目 + 关键词”核查排名。每天快照自动与上一条记录对比，三星以下差评增加时立即提醒。</p>
            <div className="table-wrap"><table><thead><tr><th>链接 / 平台SKU</th><th>日期</th><th>排名变化</th><th>评分</th><th>Review</th><th>三星以下差评</th><th>实时反馈</th></tr></thead><tbody>
              {linkMetrics.map(m=><tr key={m.id} className={m.lowStarDelta>0?'alert-row':''}><td><strong>{m.title||m.platformSku}</strong><small>{m.platformSku}</small>{m.linkUrl&&<a href={m.linkUrl} target="_blank" rel="noreferrer">打开链接 <ExternalLink size={11}/></a>}</td><td>{m.metricDate}<small>{m.previousDate?`对比 ${m.previousDate}`:'首次记录'}</small></td><td><strong>{m.rankPosition||'—'}</strong><small className={m.rankChange>0?'trend-up':m.rankChange<0?'low':''}>{m.rankChange>0?`↑ 上升 ${m.rankChange}`:m.rankChange<0?`↓ 下降 ${Math.abs(m.rankChange)}`:'—'}</small></td><td><strong>{m.rating?`${m.rating.toFixed(1)} ★`:'—'}</strong><small>{m.ratingChange?`${m.ratingChange>0?'+':''}${m.ratingChange.toFixed(2)}`:'—'}</small></td><td><strong>{m.reviewCount}</strong><small className={m.reviewDelta>0?'trend-up':''}>{m.reviewDelta>0?`+${m.reviewDelta}`:'—'}</small></td><td><strong>{m.lowStarCount}</strong><small className={m.lowStarDelta>0?'low':''}>{m.lowStarDelta>0?`新增 ${m.lowStarDelta}`:'—'}</small></td><td>{m.lowStarDelta>0?<span className="status 替换订单">⚠ 新增差评</span>:m.rankChange<0?<span className="status 低利润">关注排名下降</span>:<span className="status 正常">状态正常</span>}</td></tr>)}
            </tbody></table>{!linkMetrics.length&&<div className="empty">暂无监控快照，请粘贴当天排名与 Review 数据</div>}</div>
          </section>
          <section data-page-panel="mapping" id="sku-mapping" className="panel mapping-panel">
            <input aria-label="搜索SKU映射" placeholder="搜索销售 SKU / 系统 SKU / 名称" value={mappingSearch} onChange={e=>setMappingSearch(e.target.value)}/>
            <div className="panel-title">
              <div><small>SALES PRODUCTS</small><h2>销售产品</h2></div>
              <button onClick={() => setShowImport(true)}><Download size={15}/>导入映射</button>
            </div>
            <p className="mapping-note">平台订单保留可修改的销售 SKU，并自动归集到固定系统 SKU。销售 SKU 改名时，只需重新导入映射。</p>
            <div className="table-wrap"><table><thead><tr><th>平台</th><th>销售 SKU（可变）</th><th>系统 SKU（固定）</th><th>销售产品名称</th><th>状态</th></tr></thead><tbody>
              {mappings.filter(m=>`${m.salesSku} ${m.systemSku} ${m.displayName}`.toLowerCase().includes(mappingSearch.toLowerCase())).map(m => <tr key={m.id}><td>{m.platform}</td><td><strong>{m.salesSku}</strong></td><td><span className="system-sku">{m.systemSku}</span></td><td>{m.displayName || '—'}</td><td><span className="status 正常">{m.active ? '已启用' : '已停用'}</span></td></tr>)}
            </tbody></table>{!mappings.length && <div className="empty">暂无映射，请先导入销售产品</div>}</div>
          </section>

          <section data-page-panel="home" className="main-grid">
            <article data-page-panel="schedule" id="schedule" className="panel schedule-panel">
              <div className="panel-title">
                <div>
                  <small>实时日历</small>
                  <h2>今日安排</h2>
                </div>
                <button onClick={() => setShowTask(true)}>
                  <Plus size={16} />
                  新日程
                </button>
              </div>
              <div className="week-strip">
                {[-2, -1, 0, 1, 2, 3, 4].map((o) => {
                  const d = new Date(now);
                  d.setDate(now.getDate() + o);
                  return (
                    <div key={o} className={o === 0 ? 'today' : ''}>
                      <span>
                        {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
                      </span>
                      <strong>{d.getDate()}</strong>
                      {o === 0 && <i />}
                    </div>
                  );
                })}
              </div>
              <div className="task-list">
                {tasks.map((t) => (
                  <div
                    className={`task ${t.completed ? 'task-complete' : ''}`}
                    key={t.id}
                  >
                    <time>{t.time}</time>
                    <i style={{ background: t.color }} />
                    <div>
                      <strong>{t.title}</strong>
                      <span>{t.tag}</span>
                    </div>
                    <button
                      className={t.completed ? 'done' : ''}
                      aria-label="标记完成"
                      onClick={() => {
                        const done = !t.completed;
                        setTasks((v) =>
                          v.map((x) =>
                            x.id === t.id ? { ...x, completed: done } : x,
                          ),
                        );
                        post({
                          action: 'toggleTask',
                          id: t.id,
                          completed: done,
                        });
                        ping('日程状态已更新');
                      }}
                    >
                      {t.completed ? <Check size={15} /> : ''}
                    </button>
                  </div>
                ))}
              </div>
              {!tasks.length && (
                <div className="empty small-empty">今天还没有日程</div>
              )}
            </article>
            <article data-page-panel="log" id="daily-log" className="panel log-panel">
              <div className="panel-title">
                <div>
                  <small>DAILY LOG</small>
                  <h2>每日工作记录</h2>
                </div>
                <span>{online ? '云端草稿' : '离线'}</span>
              </div>
              <label>
                今日完成事项
                <textarea
                  value={completedText}
                  onChange={(e) => setCompletedText(e.target.value)}
                  placeholder="记录今日完成的上架、调价、核查等工作..."
                />
              </label>
              <label>
                异常与待跟进
                <textarea
                  value={followupText}
                  onChange={(e) => setFollowupText(e.target.value)}
                  placeholder="记录需要明天继续处理的问题..."
                />
              </label>
              <div className="log-actions">
                <button onClick={() => ping('附件上传将在文件存储版本开放')}>
                  <ImageIcon size={17} />
                  添加附件
                </button>
                <button onClick={saveLog}>
                  <Check size={17} />
                  保存今日记录
                </button>
              </div>
            </article>
          </section>
          <section data-page-panel="products" id="product-library" className="panel product-panel">
            <div className="panel-title">
              <div>
                <small>PRODUCT CHECK</small>
                <h2>系统产品</h2>
              </div>
              <div className="filters">
                {(['全部', '待核查', '低利润'] as const).map((x) => (
                  <button
                    key={x}
                    className={filter === x ? 'selected' : ''}
                    onClick={() => setFilter(x)}
                  >
                    {x}{' '}
                    {x === '全部'
                      ? products.length
                      : x === '待核查'
                        ? products.filter((p) => !p.checked).length
                        : products.filter((p) => p.status === '低利润').length}
                  </button>
                ))}
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>商品信息</th>
                    <th>分类 / 销售SKU</th>
                    <th>平台SKU</th>
                    <th>UPC</th>
                    <th>批发价</th>
                    <th>核算总成本</th>
                    <th>利润率</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map((p) => {
                    const m = p.margin == null ? (p.price ? ((p.price - p.cost) / p.price) * 100 : null) : p.margin * 100;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="product">
                            {p.image ? <img src={p.image} alt={p.name} /> : <span className="image-placeholder" title="该平台SKU未提供主图"><ImageIcon size={18} /></span>}
                            <div>
                              <strong>{p.name}</strong>
                              <span className="product-links">
                                {p.frontend && (
                                  <a
                                    href={p.frontend}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    前台 <ExternalLink size={12} />
                                  </a>
                                )}
                                {p.backend && (
                                  <a
                                    href={p.backend}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    后台 <ExternalLink size={12} />
                                  </a>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span>{p.category}</span>
                          <small>{p.sku}</small>
                        </td>
                        <td>
                          <span className="system-sku">{p.platformSku || '—'}</span>
                          {p.linkPrefix && <small>链接编号：{p.linkPrefix}</small>}
                        </td>
                        <td>{p.upc || '—'}</td>
                        <td>${Number(p.cost).toFixed(2)}</td>
                        <td>
                          {p.accountingCost == null ? '待核算' : `$${Number(p.accountingCost).toFixed(2)}`}
                          {p.unitProfit != null && <small className={p.unitProfit < 0 ? 'low' : ''}>利润 ${p.unitProfit < 0 ? '-' : ''}${Math.abs(p.unitProfit).toFixed(2)}</small>}
                        </td>
                        <td>
                          <b className={m != null && m < 10 ? 'low' : ''}>{m == null ? '待核算' : `${m.toFixed(1)}%`}</b>
                          {p.margin == null && p.splitStatus && <small>{p.splitStatus}</small>}
                        </td>
                        <td>
                          <span className={`status ${p.status}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className={`check ${p.checked ? 'checked' : ''}`}
                              title="核查完成"
                              onClick={() => {
                                const done = !p.checked;
                                setProducts((v) =>
                                  v.map((x) =>
                                    x.id === p.id ? { ...x, checked: done } : x,
                                  ),
                                );
                                post({
                                  action: 'toggleProduct',
                                  id: p.id,
                                  shop: selectedShop,
                                  sku: p.sku,
                                  checked: done,
                                });
                              }}
                            >
                              {p.checked && <Check size={14} />}
                            </button>
                            {selectedShop !== 'BBB-VH-3' && <button
                              className="delete"
                              title="删除"
                              onClick={() => {
                                setProducts((v) =>
                                  v.filter((x) => x.id !== p.id),
                                );
                                post({ action: 'deleteProduct', id: p.id });
                                ping('商品已删除');
                              }}
                            >
                              <Trash2 size={14} />
                            </button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filtered.length && (
                <div className="empty">没有找到匹配的商品</div>
              )}
              {filtered.length > 200 && <div className="empty small-empty">当前显示前 200 条，共 {filtered.length} 条；可使用顶部搜索快速定位销售 SKU、平台 SKU 或 UPC。</div>}
            </div>
          </section>
        </div>
      </section>
      {showImport && (
        <div className="modal-backdrop">
          <div className="modal import-modal">
            <div className="modal-head"><div><small>SALES PRODUCT IMPORT</small><h2>导入销售产品映射</h2></div><button type="button" onClick={() => setShowImport(false)}><X/></button></div>
            <p className="import-help">粘贴 CSV，每行依次为：平台、销售 SKU、固定系统 SKU、销售产品名称。相同平台与销售 SKU 再次导入会更新映射。</p>
            <textarea className="csv-input" value={importText} onChange={e => setImportText(e.target.value)} placeholder={'platform,sales_sku,system_sku,product_name\nBed Bath & Beyond,BBB-QUEEN-GRAY,SYS-BEDDING-001,灰色床盖 Queen'}/>
            <div className="modal-actions"><button onClick={() => setShowImport(false)}>取消</button><button onClick={importMappings}><Download size={17}/>确认导入</button></div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={addProduct}>
            <div className="modal-head">
              <div>
                <small>NEW PRODUCT</small>
                <h2>录入商品资料</h2>
              </div>
              <button type="button" onClick={() => setShowAdd(false)}>
                <X />
              </button>
            </div>
            <label>
              商品名称
              <input name="name" required placeholder="例如：全棉床盖三件套" />
            </label>
            <div className="form-row">
              <label>
                SKU
                <input name="sku" required placeholder="BBB-240831-05" />
              </label>
              <label>
                商品分类
                <select name="category">
                  <option>Bedding</option>
                  <option>Bath</option>
                  <option>Home Decor</option>
                  <option>Storage</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                批发价（USD）
                <input name="cost" required type="number" step="0.01" />
              </label>
              <label>
                前台价格（USD）
                <input name="price" required type="number" step="0.01" />
              </label>
            </div>
            <label>
              图片链接
              <input name="image" type="url" placeholder="https://..." />
            </label>
            <div className="form-row">
              <label>
                后台链接
                <input name="backend" type="url" placeholder="https://..." />
              </label>
              <label>
                前台链接
                <input name="frontend" type="url" placeholder="https://..." />
              </label>
            </div>
            <label>
              商品描述
              <textarea
                name="description"
                placeholder="记录材质、尺寸、卖点等信息"
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowAdd(false)}>
                取消
              </button>
              <button type="submit">
                <Plus size={17} />
                保存商品
              </button>
            </div>
          </form>
        </div>
      )}
      {showTask && (
        <div className="modal-backdrop">
          <form className="modal task-modal" onSubmit={addTask}>
            <div className="modal-head">
              <div>
                <small>NEW SCHEDULE</small>
                <h2>新建今日日程</h2>
              </div>
              <button type="button" onClick={() => setShowTask(false)}>
                <X />
              </button>
            </div>
            <div className="form-row">
              <label>
                时间
                <input name="time" required type="time" />
              </label>
              <label>
                工作类型
                <select name="tag">
                  <option>价格核查</option>
                  <option>新品上架</option>
                  <option>利润复盘</option>
                  <option>日结</option>
                  <option>其他</option>
                </select>
              </label>
            </div>
            <label>
              日程内容
              <input
                name="title"
                required
                placeholder="例如：核查今日前台价格"
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowTask(false)}>
                取消
              </button>
              <button type="submit">
                <Plus size={17} />
                保存日程
              </button>
            </div>
          </form>
        </div>
      )}
      {showOrder && (
        <div className="modal-backdrop">
          <form className="modal task-modal" onSubmit={addOrder}>
            <div className="modal-head">
              <div>
                <small>NEW ORDER</small>
                <h2>录入每日订单</h2>
              </div>
              <button type="button" onClick={() => setShowOrder(false)}>
                <X />
              </button>
            </div>
            <div className="form-row">
              <label>
                订单日期
                <input
                  name="orderDate"
                  required
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </label>
              <label>
                订单号
                <input name="orderNo" required placeholder="BBB-20260831-001" />
              </label>
            </div>
            <label>
              平台销售 SKU（自动映射系统 SKU）
              <select name="sku">
                {mappings.map((m) => (
                  <option key={m.id} value={m.salesSku}>
                    {m.salesSku} → {m.systemSku} · {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                数量
                <input
                  name="quantity"
                  required
                  type="number"
                  min="1"
                  defaultValue="1"
                />
              </label>
              <label>
                成交单价（USD）
                <input
                  name="unitPrice"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                />
              </label>
            </div>
            <label>
              订单状态
              <select name="status">
                <option>已付款</option>
                <option>待发货</option>
                <option>已发货</option>
                <option>已完成</option>
                <option>已退款</option>
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setShowOrder(false)}>
                取消
              </button>
              <button type="submit">
                <Plus size={17} />
                保存订单
              </button>
            </div>
          </form>
        </div>
      )}
      {notice && (
        <div className="toast">
          <Check size={16} />
          {notice}
        </div>
      )}
    </main>
  );
}

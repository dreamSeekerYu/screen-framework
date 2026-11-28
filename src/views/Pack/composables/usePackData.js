import { ref, reactive, computed, onMounted } from 'vue'
import { loadPackData } from '@/utils/parsePack.js'
import { buildPackInsight } from '@/utils/packRiskRules.js'

/**
 * Pack 页面数据层：加载 pack 数据、派生客户列表与风险引擎结果
 */
export function usePackData() {
  const loading = ref(true)
  const loadError = ref('')
  const packData = reactive({
    asOf: '',
    customers: [],
    peak0km: { value: 0 },
    peak3m: { value: 0 },
    peak12m: { value: 0 },
    totalCustomers: 0
  })
  const activeClient = ref('A1')

  const a1 = computed(() => packData.customers.find(c => c.key === 'A1'))
  const a2 = computed(() => packData.customers.find(c => c.key === 'A2'))
  const a3 = computed(() => packData.customers.find(c => c.key === 'A3'))
  const m5 = computed(() => packData.customers.find(c => c.key === 'M5'))
  const m6 = computed(() => packData.customers.find(c => c.key === 'M6'))
  const currentA = computed(() => {
    if (['A1', 'A2', 'A3'].includes(activeClient.value)) {
      return packData.customers.find(c => c.key === activeClient.value) || a1.value
    }
    return null
  })

  /* ========== 风险规则引擎（问题清单/结论/建议/评分/雷达 全部数据驱动） ========== */
  const insight = computed(() => {
    if (!packData.customers.length) return null
    return buildPackInsight(packData.customers)
  })

  /** 按客户 key 取风险评分与等级 */
  function riskOf(custKey) {
    const r = insight.value?.riskScores.find(x => x.custKey === custKey)
    return r || { score: 100, level: 'success', text: '达标' }
  }
  const currentRisk = computed(() => currentA.value ? riskOf(currentA.value.key) : riskOf('M5'))

  async function load() {
    try {
      loading.value = true
      const d = await loadPackData()
      Object.assign(packData, d)
    } catch (e) {
      console.error(e)
      loadError.value = e.message || '未知错误'
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  return {
    loading,
    loadError,
    packData,
    activeClient,
    a1,
    a2,
    a3,
    m5,
    m6,
    currentA,
    insight,
    riskOf,
    currentRisk,
    load
  }
}

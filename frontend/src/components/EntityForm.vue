<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { Entity, Item, Resource } from '../types'
import { listProducts, listSkus } from '../api/catalog'
import { listSuppliers } from '../api/supplier'
import { listPurchaseOrders } from '../api/procurement'
import { configs } from '../views/resources'
import { money, total } from '../utils/money'
const props = defineProps<{ resource: Resource; initial?: Entity }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()
const form = ref<FormInstance>(),
  busy = ref(false),
  loading = ref(true),
  error = ref(false)
const model = reactive<Partial<Entity>>(
  props.initial
    ? structuredClone(toRaw(props.initial))
    : { name: '', status: 'ACTIVE', price: '', items: [], warehouse: '杭州中心仓' },
)
const products = ref<Entity[]>([]),
  suppliers = ref<Entity[]>([]),
  skus = ref<Entity[]>([]),
  orders = ref<Entity[]>([])
const isRequest = computed(() => props.resource === 'purchase-requests'),
  isReceipt = computed(() => props.resource === 'warehouse-receipts')
const rules: FormRules = {
  name: [
    { required: !isReceipt.value, message: '请输入名称', trigger: 'blur' },
    { max: 100, message: '名称不能超过 100 字', trigger: 'blur' },
  ],
  contact: [{ required: true, message: '请输入联系人' }],
  phone: [{ required: true, pattern: /^[+\d ()-]{6,25}$/, message: '请输入有效联系电话' }],
  email: [{ type: 'email', message: '请输入有效邮箱', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类' }],
  productId: [{ required: true, message: '请选择商品' }],
  supplierId: [{ required: true, message: '请选择供应商' }],
  spec: [{ required: true, message: '请输入规格' }],
  price: [
    { required: true, pattern: /^\d{1,10}(\.\d{1,2})?$/, message: '请输入最多两位小数的金额' },
  ],
  orderId: [{ required: true, message: '请选择采购订单' }],
  warehouse: [{ required: true, message: '请选择仓库' }],
}
const requestTotal = computed(() => {
  try {
    return total(model.items || [])
  } catch {
    return '0.00'
  }
})
const order = computed(() => orders.value.find((o) => o.id === model.orderId))
async function load() {
  loading.value = true
  error.value = false
  try {
    if (props.resource === 'skus') {
      const result = await Promise.all([
        listProducts({ page_size: 1000 }),
        listSuppliers({ page_size: 1000 }),
      ])
      products.value = result[0].items
      suppliers.value = result[1].items
    }
    if (isRequest.value) skus.value = (await listSkus({ status: 'ACTIVE', page_size: 1000 })).items
    if (isReceipt.value)
      orders.value = (await listPurchaseOrders({ page_size: 1000 })).items.filter((o) =>
        ['ORDERED', 'PARTIAL'].includes(o.status),
      )
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)
function addItem() {
  model.items!.push({ skuId: '', name: '', price: '0.00', quantity: 1, received: 0 })
}
function selectSku(item: Item) {
  const sku = skus.value.find((s) => s.id === item.skuId)
  item.name = sku?.name || ''
  item.price = sku?.price || '0.00'
}
function selectOrder() {
  model.items = (order.value?.items || []).map((i) => ({ ...i, quantity: 0 }))
}
function remaining(skuId: string) {
  const item = order.value?.items?.find((i) => i.skuId === skuId)
  return item ? item.quantity - item.received : 0
}
async function submit() {
  if (busy.value || !(await form.value?.validate().catch(() => false))) return
  if (
    isRequest.value &&
    (!model.items?.length ||
      model.items.some((i) => !i.skuId || !Number.isInteger(i.quantity) || i.quantity <= 0))
  ) {
    ElMessage.warning('请添加完整的采购明细')
    return
  }
  const data = structuredClone(toRaw(model))
  if (isReceipt.value) {
    data.items = data.items?.filter((i) => i.quantity > 0)
    if (!data.items?.length) {
      ElMessage.warning('请至少填写一条入库数量')
      return
    }
  }
  busy.value = true
  try {
    await configs[props.resource].save!(data, props.initial?.id)
    ElMessage.success(isReceipt.value ? '入库成功，库存与流水已更新' : '保存成功')
    emit('saved')
  } catch {
    /* centralized */
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div v-loading="loading">
    <el-result v-if="error" icon="error" title="选项加载失败"
      ><template #extra><el-button @click="load">重试</el-button></template></el-result
    ><el-form
      v-else
      ref="form"
      :model="model"
      :rules="rules"
      label-position="top"
      @submit.prevent="submit"
    >
      <el-form-item v-if="!isReceipt" :label="isRequest ? '申请标题' : '名称'" prop="name">
        <el-input
          v-model="model.name"
          maxlength="100"
          :placeholder="isRequest ? '例如：研发部门办公耗材季度采购' : '请输入名称'"
        />
      </el-form-item>
      <template v-if="resource === 'suppliers'">
        <div class="form-grid">
          <el-form-item label="联系人" prop="contact">
            <el-input v-model="model.contact" placeholder="例如：李经理" />
          </el-form-item>
          <el-form-item label="联系电话" prop="phone">
            <el-input v-model="model.phone" placeholder="例如：13800000000" />
          </el-form-item>
        </div>
        <el-form-item label="电子邮箱" prop="email">
          <el-input v-model="model.email" placeholder="例如：supplier@example.com" />
        </el-form-item>
      </template>
      <el-form-item v-if="resource === 'products'" label="商品分类" prop="category">
        <el-select v-model="model.category" placeholder="请选择商品分类">
          <el-option v-for="v in ['数码设备', '办公家具', '办公耗材']" :key="v" :value="v" />
        </el-select>
      </el-form-item>
      <template v-if="resource === 'skus'">
        <el-form-item label="关联商品" prop="productId">
          <el-select v-model="model.productId" filterable placeholder="选择所属商品">
            <el-option
              v-for="v in products"
              :key="v.id"
              :label="v.name"
              :value="v.id"
              :disabled="v.status !== 'ACTIVE'"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="供应商" prop="supplierId">
          <el-select v-model="model.supplierId" filterable placeholder="选择供货供应商">
            <el-option
              v-for="v in suppliers"
              :key="v.id"
              :label="v.name"
              :value="v.id"
              :disabled="v.status !== 'ACTIVE'"
            />
          </el-select>
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="规格" prop="spec">
            <el-input v-model="model.spec" placeholder="例如：黑色 / 500张每包" />
          </el-form-item>
          <el-form-item label="采购单价（元）" prop="price">
            <el-input v-model="model.price" placeholder="0.00" />
          </el-form-item>
        </div>
      </template>
      <template v-if="isRequest">
        <div class="section-title">
          <h3>采购明细</h3>
          <el-button text type="primary" @click="addItem">＋ 添加明细</el-button>
        </div>
        <div v-for="(item, index) in model.items" :key="index" class="line-editor">
          <el-select
            v-model="item.skuId"
            placeholder="选择物料 SKU"
            filterable
            @change="selectSku(item)"
          >
            <el-option
              v-for="v in skus"
              :key="v.id"
              :label="v.name"
              :value="v.id"
              :disabled="model.items?.some((i, j) => j !== index && i.skuId === v.id)"
            />
          </el-select>
          <el-input-number
            v-model="item.quantity"
            :min="1"
            :max="100000"
            :precision="0"
            aria-label="采购数量"
          />
          <span>{{ money(item.price) }}</span>
          <el-button text type="danger" @click="model.items!.splice(index, 1)">移除</el-button>
        </div>
        <el-empty
          v-if="!model.items?.length"
          description="暂无明细，请点击上方添加采购商品"
          :image-size="60"
        />
        <div class="amount-total">
          申请总额 <strong>{{ money(requestTotal) }}</strong>
        </div>
      </template>
      <template v-if="isReceipt">
        <el-form-item label="采购订单" prop="orderId">
          <el-select
            v-model="model.orderId"
            filterable
            placeholder="选择待入库采购订单"
            @change="selectOrder"
          >
            <el-option
              v-for="v in orders"
              :key="v.id"
              :label="`${v.id} · ${v.name}`"
              :value="v.id"
            />
          </el-select>
        </el-form-item>
        <el-empty
          v-if="!loading && !orders.length"
          description="暂无待入库的采购订单"
          :image-size="60" />
        <el-form-item label="收货仓库" prop="warehouse">
          <el-select v-model="model.warehouse" placeholder="选择目标仓库">
            <el-option v-for="w in ['杭州中心仓', '上海分仓']" :key="w" :value="w" />
          </el-select>
        </el-form-item>
        <div v-for="item in model.items" :key="item.skuId" class="receipt-line">
          <div>
            <strong>{{ item.name }}</strong
            ><small
              >计划 {{ order?.items?.find((i) => i.skuId === item.skuId)?.quantity }} · 已入库
              {{ item.received }} · 剩余 {{ remaining(item.skuId) }}</small
            >
          </div>
          <el-input-number
            v-model="item.quantity"
            :min="0"
            :max="remaining(item.skuId)"
            :precision="0"
            aria-label="本次入库数量"
          /></div
      ></template>
      <el-form-item v-if="!isRequest && !isReceipt" label="状态"
        ><el-radio-group v-model="model.status"
          ><el-radio value="ACTIVE">启用</el-radio
          ><el-radio value="INACTIVE">停用</el-radio></el-radio-group
        ></el-form-item
      >
      <el-form-item v-if="isRequest" label="申请说明"
        ><el-input v-model="model.note" type="textarea" :rows="3" maxlength="500" show-word-limit
      /></el-form-item>
      <div class="form-footer">
        <el-button :disabled="busy" @click="emit('cancel')">取消</el-button
        ><el-button
          type="primary"
          native-type="submit"
          :loading="busy"
          :disabled="loading || error"
          >{{ isReceipt ? '确认入库' : '保存' }}</el-button
        >
      </div>
    </el-form>
  </div>
</template>

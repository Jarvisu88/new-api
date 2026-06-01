/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Col,
  Form,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  API,
  removeTrailingSlash,
  showError,
  showSuccess,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';
import { BookOpen, PackageCheck, Plus, RefreshCw, Save, Store } from 'lucide-react';

const { Text } = Typography;

const defaultInputs = {
  WaffoPancakeMerchantID: '',
  WaffoPancakePrivateKey: '',
  WaffoPancakeStoreID: '',
  WaffoPancakeProductID: '',
  WaffoPancakeReturnURL: '',
  WaffoPancakeUnitPrice: 1.0,
  WaffoPancakeMinTopUp: 1,
};

const trim = (value) => String(value || '').trim();

export default function SettingsPaymentGatewayWaffoPancake(props) {
  const { t } = useTranslation();
  const sectionTitle = props.hideSectionTitle
    ? undefined
    : t('Waffo Pancake 设置');
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [pairLoading, setPairLoading] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [inputs, setInputs] = useState(defaultInputs);
  const formApiRef = useRef(null);

  const publicBaseURL = removeTrailingSlash(
    props.options?.ServerAddress || window.location.origin,
  );
  const testWebhookURL = `${publicBaseURL}/api/waffo-pancake/webhook/test`;
  const prodWebhookURL = `${publicBaseURL}/api/waffo-pancake/webhook/prod`;
  const persistedMerchantID = props.options?.WaffoPancakeMerchantID || '';

  useEffect(() => {
    if (!props.options || !formApiRef.current) return;

    const currentInputs = {
      WaffoPancakeMerchantID: props.options.WaffoPancakeMerchantID || '',
      WaffoPancakePrivateKey: '',
      WaffoPancakeStoreID: props.options.WaffoPancakeStoreID || '',
      WaffoPancakeProductID: props.options.WaffoPancakeProductID || '',
      WaffoPancakeReturnURL: props.options.WaffoPancakeReturnURL || '',
      WaffoPancakeUnitPrice:
        props.options.WaffoPancakeUnitPrice !== undefined
          ? parseFloat(props.options.WaffoPancakeUnitPrice)
          : 1.0,
      WaffoPancakeMinTopUp:
        props.options.WaffoPancakeMinTopUp !== undefined
          ? parseFloat(props.options.WaffoPancakeMinTopUp)
          : 1,
    };

    setInputs(currentInputs);
    formApiRef.current.setValues(currentInputs);
  }, [props.options]);

  const selectedStore = useMemo(() => {
    return (catalog || []).find((store) => store.id === inputs.WaffoPancakeStoreID);
  }, [catalog, inputs.WaffoPancakeStoreID]);

  const productOptions = selectedStore?.onetimeProducts || [];

  const handleFormChange = (values) => {
    setInputs((prev) => ({ ...prev, ...values }));
  };

  const getFormValues = () => ({
    ...inputs,
    ...(formApiRef.current?.getValues?.() || {}),
  });

  const buildCredentialBody = (values) => {
    const merchantID = trim(values.WaffoPancakeMerchantID);
    const privateKey = trim(values.WaffoPancakePrivateKey);

    if (privateKey || merchantID !== persistedMerchantID) {
      return {
        merchant_id: merchantID,
        private_key: privateKey,
      };
    }

    return {};
  };

  const loadCatalog = async () => {
    const values = getFormValues();
    setCatalogLoading(true);
    try {
      const res = await API.post(
        '/api/option/waffo-pancake/catalog',
        buildCredentialBody(values),
      );
      if (res.data?.message === 'success') {
        const stores = res.data?.data?.stores || [];
        setCatalog(stores);
        showSuccess(
          stores.length > 0 ? t('目录已更新') : t('未找到可绑定的店铺'),
        );
      } else {
        showError(
          typeof res.data?.data === 'string'
            ? res.data.data
            : res.data?.message || t('拉取目录失败'),
        );
      }
    } catch (error) {
      showError(t('拉取目录失败'));
    } finally {
      setCatalogLoading(false);
    }
  };

  const createPair = async () => {
    const values = getFormValues();
    setPairLoading(true);
    try {
      const res = await API.post('/api/option/waffo-pancake/pair', {
        ...buildCredentialBody(values),
        return_url: removeTrailingSlash(values.WaffoPancakeReturnURL || ''),
      });
      if (res.data?.message === 'success') {
        const data = res.data?.data || {};
        const nextValues = {
          ...values,
          WaffoPancakeStoreID: data.store_id || '',
          WaffoPancakeProductID: data.product_id || '',
        };
        setInputs(nextValues);
        formApiRef.current?.setValues(nextValues);
        setCatalog((prev) => [
          {
            id: data.store_id,
            name: data.store_name || data.store_id,
            status: 'active',
            prodEnabled: true,
            onetimeProducts: data.product_id
              ? [
                  {
                    id: data.product_id,
                    name: data.product_name || data.product_id,
                    status: 'active',
                  },
                ]
              : [],
          },
          ...(prev || []).filter((store) => store.id !== data.store_id),
        ]);
        showSuccess(t('已创建店铺和商品，请保存配置'));
      } else {
        const data = res.data?.data || {};
        if (data.orphan_store && data.store_id) {
          const nextValues = {
            ...values,
            WaffoPancakeStoreID: data.store_id,
          };
          setInputs(nextValues);
          formApiRef.current?.setValues(nextValues);
        }
        showError(
          typeof data === 'string'
            ? data
            : data.error || res.data?.message || t('创建失败'),
        );
      }
    } catch (error) {
      showError(t('创建失败'));
    } finally {
      setPairLoading(false);
    }
  };

  const saveSettings = async () => {
    const values = getFormValues();
    const merchantID = trim(values.WaffoPancakeMerchantID);
    const storeID = trim(values.WaffoPancakeStoreID);
    const productID = trim(values.WaffoPancakeProductID);
    const unitPrice = Number(values.WaffoPancakeUnitPrice || 0);
    const minTopUp = Number(values.WaffoPancakeMinTopUp || 0);

    if (!merchantID) {
      showError(t('请输入商户 ID'));
      return;
    }
    if (!storeID) {
      showError(t('请选择或填写 Store ID'));
      return;
    }
    if (!productID) {
      showError(t('请选择或填写 Product ID'));
      return;
    }
    if (unitPrice <= 0) {
      showError(t('充值价格必须大于 0'));
      return;
    }
    if (minTopUp < 1) {
      showError(t('最低充值美元数量必须大于 0'));
      return;
    }

    setLoading(true);
    try {
      const saveRes = await API.post('/api/option/waffo-pancake/save', {
        merchant_id: merchantID,
        private_key: trim(values.WaffoPancakePrivateKey),
        return_url: removeTrailingSlash(values.WaffoPancakeReturnURL || ''),
        store_id: storeID,
        product_id: productID,
      });
      if (saveRes.data?.message !== 'success') {
        showError(saveRes.data?.data || saveRes.data?.message || t('保存配置失败'));
        return;
      }

      const optionResults = await Promise.all([
        API.put('/api/option/', {
          key: 'WaffoPancakeUnitPrice',
          value: String(unitPrice),
        }),
        API.put('/api/option/', {
          key: 'WaffoPancakeMinTopUp',
          value: String(minTopUp),
        }),
      ]);
      const failed = optionResults.find((res) => !res.data?.success);
      if (failed) {
        showError(failed.data?.message || t('部分保存失败'));
        return;
      }

      showSuccess(t('更新成功'));
      props.refresh?.();
    } catch (error) {
      showError(t('保存配置失败'));
    } finally {
      setLoading(false);
    }
  };

  const storeOptions = (catalog || []).map((store) => ({
    label: `${store.name || store.id} (${store.id})`,
    value: store.id,
  }));

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={sectionTitle}>
          <Banner
            type='info'
            icon={<BookOpen size={16} />}
            description={
              <Space vertical align='start' spacing={4}>
                <Text>
                  {t(
                    'Waffo Pancake 通过商户 ID、API 私钥、Store 和 Product 绑定托管结账。',
                  )}
                </Text>
                <Text copyable={{ content: testWebhookURL }}>
                  {t('测试 Webhook 地址')}：{testWebhookURL}
                </Text>
                <Text copyable={{ content: prodWebhookURL }}>
                  {t('生产 Webhook 地址')}：{prodWebhookURL}
                </Text>
              </Space>
            }
            style={{ marginBottom: 16 }}
          />

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Input
                field='WaffoPancakeMerchantID'
                label={t('商户 ID')}
                placeholder={t('例如：MER_xxx')}
                extraText={t('来自 Waffo Pancake 控制台')}
              />
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.TextArea
                field='WaffoPancakePrivateKey'
                label={t('API 私钥')}
                placeholder={t('填写后覆盖当前私钥，留空表示保持当前不变')}
                extraText={t('保存后不会回显')}
                type='password'
                autosize={{ minRows: 3, maxRows: 6 }}
              />
            </Col>
          </Row>

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={24} md={24} lg={24} xl={24}>
              <Form.Input
                field='WaffoPancakeReturnURL'
                label={t('支付返回地址')}
                placeholder={`${publicBaseURL}/console/topup`}
                extraText={t('留空则自动使用当前站点的默认充值页地址')}
              />
            </Col>
          </Row>

          <Space wrap style={{ marginTop: 16, marginBottom: 16 }}>
            <Button
              icon={<RefreshCw size={14} />}
              onClick={loadCatalog}
              loading={catalogLoading}
            >
              {t('验证并拉取目录')}
            </Button>
            <Button
              icon={<Plus size={14} />}
              type='primary'
              theme='light'
              onClick={createPair}
              loading={pairLoading}
            >
              {t('创建 Store + Product')}
            </Button>
          </Space>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              {storeOptions.length > 0 ? (
                <Form.Select
                  field='WaffoPancakeStoreID'
                  label={t('绑定 Store')}
                  placeholder={t('请选择 Store')}
                  optionList={storeOptions}
                  onChange={(value) => {
                    const next = {
                      ...getFormValues(),
                      WaffoPancakeStoreID: value,
                      WaffoPancakeProductID: '',
                    };
                    setInputs(next);
                    formApiRef.current?.setValues(next);
                  }}
                  prefix={<Store size={14} />}
                  showClear
                  filter
                />
              ) : (
                <Form.Input
                  field='WaffoPancakeStoreID'
                  label={t('Store ID')}
                  placeholder={t('例如：STO_xxx')}
                  extraText={t('也可以先拉取目录后选择')}
                />
              )}
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              {productOptions.length > 0 ? (
                <Form.Select
                  field='WaffoPancakeProductID'
                  label={t('绑定 Product')}
                  placeholder={t('请选择 Product')}
                  prefix={<PackageCheck size={14} />}
                  showClear
                  filter
                >
                  {productOptions.map((product) => (
                    <Select.Option key={product.id} value={product.id}>
                      {product.name || product.id} ({product.id})
                    </Select.Option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Input
                  field='WaffoPancakeProductID'
                  label={t('Product ID')}
                  placeholder={t('例如：PROD_xxx')}
                  extraText={t('请选择当前 Store 下的可用一次性商品')}
                />
              )}
            </Col>
          </Row>

          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='WaffoPancakeUnitPrice'
                precision={2}
                label={t('充值价格（x元/美金）')}
                placeholder={t('例如：7，就是7元/美金')}
                extraText={t('按 1 美元对应的站内价格填写')}
                min={0}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='WaffoPancakeMinTopUp'
                label={t('最低充值美元数量')}
                placeholder={t('例如：2，就是最低充值2$')}
                extraText={t('用户单次最少可充值的美元数量')}
                min={1}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Slot label={t('当前绑定')}>
                <Space wrap>
                  <Tag color={inputs.WaffoPancakeStoreID ? 'green' : 'grey'}>
                    Store: {inputs.WaffoPancakeStoreID || t('未设置')}
                  </Tag>
                  <Tag color={inputs.WaffoPancakeProductID ? 'green' : 'grey'}>
                    Product: {inputs.WaffoPancakeProductID || t('未设置')}
                  </Tag>
                </Space>
              </Form.Slot>
            </Col>
          </Row>

          <Button icon={<Save size={14} />} onClick={saveSettings}>
            {t('更新 Waffo Pancake 设置')}
          </Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}

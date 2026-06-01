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

import React, { useEffect, useState } from 'react';
import { Banner, Button, Card, Space, Spin, Tabs, Typography } from '@douyinfe/semi-ui';
import SettingsGeneralPayment from '../../pages/Setting/Payment/SettingsGeneralPayment';
import SettingsPaymentGateway from '../../pages/Setting/Payment/SettingsPaymentGateway';
import SettingsPaymentGatewayStripe from '../../pages/Setting/Payment/SettingsPaymentGatewayStripe';
import SettingsPaymentGatewayCreem from '../../pages/Setting/Payment/SettingsPaymentGatewayCreem';
import SettingsPaymentGatewayWaffo from '../../pages/Setting/Payment/SettingsPaymentGatewayWaffo';
import SettingsPaymentGatewayWaffoPancake from '../../pages/Setting/Payment/SettingsPaymentGatewayWaffoPancake';
import { API, showError, showSuccess, toBoolean } from '../../helpers';
import { useTranslation } from 'react-i18next';

const PaymentSetting = () => {
  const { t } = useTranslation();
  let [inputs, setInputs] = useState({
    ServerAddress: '',
    PayAddress: '',
    EpayId: '',
    EpayKey: '',
    Price: 7.3,
    MinTopUp: 1,
    TopupGroupRatio: '',
    CustomCallbackAddress: '',
    PayMethods: '',
    AmountOptions: '',
    AmountDiscount: '',

    StripeApiSecret: '',
    StripeWebhookSecret: '',
    StripePriceId: '',
    StripeUnitPrice: 8.0,
    StripeMinTopUp: 1,
    StripePromotionCodesEnabled: false,

    WaffoPancakeMerchantID: '',
    WaffoPancakePrivateKey: '',
    WaffoPancakeStoreID: '',
    WaffoPancakeProductID: '',
    WaffoPancakeReturnURL: '',
    WaffoPancakeUnitPrice: 1.0,
    WaffoPancakeMinTopUp: 1,

    PaymentComplianceConfirmed: false,
    PaymentComplianceTermsVersion: '',
    PaymentComplianceConfirmedAt: 0,
    PaymentComplianceConfirmedBy: 0,
    PaymentComplianceConfirmedIP: '',
  });

  let [loading, setLoading] = useState(false);

  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (success) {
      let newInputs = {};
      data.forEach((item) => {
        switch (item.key) {
          case 'TopupGroupRatio':
            try {
              newInputs[item.key] = JSON.stringify(
                JSON.parse(item.value),
                null,
                2,
              );
            } catch (error) {
              newInputs[item.key] = item.value;
            }
            break;
          case 'payment_setting.amount_options':
            try {
              newInputs['AmountOptions'] = JSON.stringify(
                JSON.parse(item.value),
                null,
                2,
              );
            } catch (error) {
              newInputs['AmountOptions'] = item.value;
            }
            break;
          case 'payment_setting.amount_discount':
            try {
              newInputs['AmountDiscount'] = JSON.stringify(
                JSON.parse(item.value),
                null,
                2,
              );
            } catch (error) {
              newInputs['AmountDiscount'] = item.value;
            }
            break;
          case 'Price':
          case 'MinTopUp':
          case 'StripeUnitPrice':
          case 'StripeMinTopUp':
          case 'WaffoPancakeUnitPrice':
          case 'WaffoPancakeMinTopUp':
            newInputs[item.key] = parseFloat(item.value);
            break;
          case 'WaffoPancakeMerchantID':
          case 'WaffoPancakePrivateKey':
          case 'WaffoPancakeStoreID':
          case 'WaffoPancakeProductID':
          case 'WaffoPancakeReturnURL':
            newInputs[item.key] = item.value;
            break;
          case 'payment_setting.compliance_confirmed':
            newInputs.PaymentComplianceConfirmed = toBoolean(item.value);
            break;
          case 'payment_setting.compliance_terms_version':
            newInputs.PaymentComplianceTermsVersion = item.value;
            break;
          case 'payment_setting.compliance_confirmed_at':
            newInputs.PaymentComplianceConfirmedAt = parseInt(item.value || '0', 10);
            break;
          case 'payment_setting.compliance_confirmed_by':
            newInputs.PaymentComplianceConfirmedBy = parseInt(item.value || '0', 10);
            break;
          case 'payment_setting.compliance_confirmed_ip':
            newInputs.PaymentComplianceConfirmedIP = item.value;
            break;
          default:
            if (item.key.endsWith('Enabled')) {
              newInputs[item.key] = toBoolean(item.value);
            } else {
              newInputs[item.key] = item.value;
            }
            break;
        }
      });

      setInputs((prev) => ({ ...prev, ...newInputs }));
    } else {
      showError(t(message));
    }
  };

  const confirmPaymentCompliance = async () => {
    setLoading(true);
    try {
      const res = await API.post('/api/option/payment_compliance', {
        confirmed: true,
      });
      if (res.data?.success) {
        showSuccess(t('合规声明已确认'));
        await onRefresh();
      } else {
        showError(res.data?.message || t('确认失败'));
      }
    } catch (error) {
      showError(t('确认失败'));
    } finally {
      setLoading(false);
    }
  };

  async function onRefresh() {
    try {
      setLoading(true);
      await getOptions();
    } catch (error) {
      showError(t('刷新失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    onRefresh();
  }, []);

  return (
    <>
      <Spin spinning={loading} size='large'>
        <Card style={{ marginTop: '10px' }}>
          {!inputs.PaymentComplianceConfirmed && (
            <Banner
              type='warning'
              closeIcon={null}
              style={{ marginBottom: 16 }}
              title={t('请先确认支付合规声明')}
              description={
                <Space vertical align='start'>
                  <Typography.Text>
                    {t('确认后才会启用充值、订阅购买和支付网关配置。')}
                  </Typography.Text>
                  <Button
                    type='warning'
                    theme='solid'
                    onClick={confirmPaymentCompliance}
                  >
                    {t('确认支付合规声明')}
                  </Button>
                </Space>
              }
            />
          )}
          <Tabs
            type='card'
            defaultActiveKey='general'
            contentStyle={{ paddingTop: 24 }}
          >
            <Tabs.TabPane tab={t('通用设置')} itemKey='general'>
              <SettingsGeneralPayment
                options={inputs}
                refresh={onRefresh}
                hideSectionTitle
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('易支付设置')} itemKey='epay'>
              <SettingsPaymentGateway
                options={inputs}
                refresh={onRefresh}
                hideSectionTitle
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Stripe 设置')} itemKey='stripe'>
              <SettingsPaymentGatewayStripe
                options={inputs}
                refresh={onRefresh}
                hideSectionTitle
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Creem 设置')} itemKey='creem'>
              <SettingsPaymentGatewayCreem
                options={inputs}
                refresh={onRefresh}
                hideSectionTitle
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Waffo 设置')} itemKey='waffo'>
              <SettingsPaymentGatewayWaffo
                options={inputs}
                refresh={onRefresh}
                hideSectionTitle
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab={t('Waffo Pancake 设置')} itemKey='waffo-pancake'>
              <SettingsPaymentGatewayWaffoPancake
                options={inputs}
                refresh={onRefresh}
                hideSectionTitle
              />
            </Tabs.TabPane>
          </Tabs>
        </Card>
      </Spin>
    </>
  );
};

export default PaymentSetting;

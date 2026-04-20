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

import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Typography } from '@douyinfe/semi-ui';
import {
  ArrowUpRight,
  BookOpenText,
  CircleDollarSign,
  Copy,
  LayoutDashboard,
  Link2,
  Sparkles,
  WalletCards,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import {
  AzureAI,
  Claude,
  Cohere,
  DeepSeek,
  Gemini,
  Grok,
  Hunyuan,
  Midjourney,
  Minimax,
  Moonshot,
  OpenAI,
  Qingyan,
  Qwen,
  Spark,
  Suno,
  Volcengine,
  Wenxin,
  XAI,
  Xinference,
  Zhipu,
} from '@lobehub/icons';
import { API, copy, showError, showSuccess } from '../../helpers';
import NoticeModal from '../../components/layout/NoticeModal';
import ProximityBackground from '../../components/common/ProximityBackground';
import ProximityProviderIcons from '../../components/common/ProximityProviderIcons';
import SentenceFlip from '../../components/common/SentenceFlip';
import { API_ENDPOINTS } from '../../constants/common.constant';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { useIsMobile } from '../../hooks/common/useIsMobile';

const { Text, Title, Paragraph } = Typography;

const providerItems = [
  { label: 'Moonshot', Icon: Moonshot },
  { label: 'OpenAI', Icon: OpenAI },
  { label: 'xAI', Icon: XAI },
  { label: 'Zhipu', Icon: Zhipu.Color },
  { label: 'Volcengine', Icon: Volcengine.Color },
  { label: 'Cohere', Icon: Cohere.Color },
  { label: 'Claude', Icon: Claude.Color },
  { label: 'Gemini', Icon: Gemini.Color },
  { label: 'Suno', Icon: Suno },
  { label: 'MiniMax', Icon: Minimax.Color },
  { label: 'Wenxin', Icon: Wenxin.Color },
  { label: 'Spark', Icon: Spark.Color },
  { label: 'Qingyan', Icon: Qingyan.Color },
  { label: 'DeepSeek', Icon: DeepSeek.Color },
  { label: 'Qwen', Icon: Qwen.Color },
  { label: 'Midjourney', Icon: Midjourney },
  { label: 'Grok', Icon: Grok },
  { label: 'Azure AI', Icon: AzureAI.Color },
  { label: 'Hunyuan', Icon: Hunyuan.Color },
  { label: 'Xinference', Icon: Xinference.Color },
];

const joinBaseAndPath = (base, path) => {
  const normalizedBase = `${base || ''}`.replace(/\/+$/, '');
  return `${normalizedBase}${path}`;
};

const quickLinkIconMap = {
  console: LayoutDashboard,
  about: Sparkles,
  pricing: CircleDollarSign,
  docs: BookOpenText,
  topup: WalletCards,
};

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const isMobile = useIsMobile();
  const iframeRef = useRef(null);
  const heroRef = useRef(null);

  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [ctaOpen, setCtaOpen] = useState(false);
  const [endpointIndex, setEndpointIndex] = useState(0);

  const status = statusState?.status || {};
  const docsLink = status.docs_link || '';
  const serverAddress = status.server_address || window.location.origin;
  const normalizedServerAddress = `${serverAddress}`.replace(/\/+$/, '');
  const endpointItems = useMemo(() => API_ENDPOINTS.map((value) => ({ value })), []);
  const currentEndpoint = endpointItems[endpointIndex]?.value || API_ENDPOINTS[0];
  const currentEndpointUrl = joinBaseAndPath(
    normalizedServerAddress,
    currentEndpoint,
  );
  const heroHeadlineSentences = useMemo(
    () => [
      {
        parts: [
          { text: t('一个入口') },
          { text: t('连接所有模型'), highlight: true },
        ],
      },
      {
        parts: [
          { text: t('统一接入') },
          { text: t('聚合主流供应商'), highlight: true },
        ],
      },
      {
        parts: [
          { text: t('多家渠道') },
          { text: t('一套 API 管理'), highlight: true },
        ],
      },
      {
        parts: [
          { text: t('复制 URL') },
          { text: t('即可开始接入'), highlight: true },
        ],
      },
      {
        parts: [
          { text: t('切换模型') },
          { text: t('无需重构业务'), highlight: true },
        ],
      },
    ],
    [t],
  );

  const quickLinks = useMemo(() => {
    const links = [
      {
        key: 'console',
        label: t('进入控制台'),
        to: '/console',
      },
      {
        key: 'about',
        label: t('产品介绍'),
        to: '/about',
      },
      {
        key: 'pricing',
        label: t('查看价格页'),
        to: '/pricing',
      },
      {
        key: 'docs',
        label: docsLink ? t('打开文档') : t('查看关于页'),
        to: docsLink || '/about',
        external: Boolean(docsLink),
      },
    ];

    if (
      status.top_up_link ||
      status.enable_online_topup ||
      status.enable_stripe_topup ||
      status.enable_creem_topup ||
      status.enable_waffo_topup
    ) {
      links.push({
        key: 'topup',
        label: t('充值与订阅'),
        to: '/topup',
      });
    }

    return links;
  }, [
    docsLink,
    status.enable_creem_topup,
    status.enable_online_topup,
    status.enable_stripe_topup,
    status.enable_waffo_topup,
    status.top_up_link,
    t,
  ]);

  const radialQuickLinks = useMemo(
    () =>
      quickLinks.map((item, index) => {
        const Icon = quickLinkIconMap[item.key] || ArrowUpRight;
        const angle = -180 + index * (90 / Math.max(quickLinks.length - 1, 1));
        const radius = isMobile ? 0 : 116;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;

        return {
          ...item,
          Icon,
          style: {
            '--menu-x': `${x}px`,
            '--menu-y': `${y}px`,
            '--menu-index': index,
          },
        };
      }),
    [isMobile, quickLinks],
  );


  const postIframeThemeAndLang = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      return;
    }
    iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
    iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
  };

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);
    } else {
      showError(message);
      setHomePageContent('加载首页内容失败...');
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(normalizedServerAddress);
    if (ok) {
      showSuccess(t('已复制到剪切板'));
    }
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };

    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % endpointItems.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [endpointItems.length]);

  useEffect(() => {
    if (homePageContent.startsWith('https://')) {
      postIframeThemeAndLang();
    }
  }, [actualTheme, homePageContent, i18n.language]);

  if (!homePageContentLoaded) {
    return (
      <div className='min-h-screen w-full overflow-x-hidden bg-semi-color-bg-0 pt-[92px]'>
        <div className='mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-4'>
          <Text type='tertiary'>{t('正在加载首页内容...')}</Text>
        </div>
      </div>
    );
  }

  const renderDefaultHome = () => (
    <div className='newapi-home-page'>
      <section ref={heroRef} className='newapi-home-hero'>
        <ProximityBackground
          containerRef={heroRef}
          diameter={isMobile ? 38 : 54}
          disabled={isMobile}
        />
        <div className='newapi-stack-shell'>
          <div className='newapi-stack-hero-copy'>
            <div className='newapi-stack-kicker'>
              <span>{status.version || 'v0.12.14'}</span>
              <span>{t('统一 AI 网关')}</span>
            </div>

            <div
              className='newapi-stack-provider-icons'
              aria-label={t('支持的供应商')}
            >
              {providerItems.slice(0, 10).map(({ label, Icon }, index) => (
                <span
                  key={label}
                  className='newapi-stack-provider-icon'
                  style={{ '--icon-index': index }}
                  title={label}
                >
                  <Icon size={22} />
                </span>
              ))}
            </div>

            <ProximityProviderIcons
              items={providerItems}
              ariaLabel={t('鏀寔鐨勪緵搴斿晢')}
              disabled={isMobile}
              className='newapi-stack-provider-icons--proximity'
            />

            <Title heading={1} className='newapi-stack-title'>
              <SentenceFlip sentences={heroHeadlineSentences} />
            </Title>

            <Paragraph className='newapi-stack-subtitle'>
              {t('new-api 将 OpenAI、Claude、Gemini、Azure、DeepSeek 等众多供应商收束成统一 API，复制接入 URL 就能切换你的模型基址。')}
            </Paragraph>

            <div className='newapi-stack-actions'>
              <Link
                to='/console'
                className='newapi-stack-action newapi-stack-action--dark'
              >
                <span className='newapi-stack-action__orb'>
                  <LayoutDashboard size={17} />
                </span>
                <span>{t('进入控制台')}</span>
              </Link>
              <button
                type='button'
                className='newapi-stack-action newapi-stack-action--blue'
                onClick={handleCopyBaseURL}
              >
                <span>{t('复制接入 URL')}</span>
                <span className='newapi-stack-action__bubble'>
                  <Copy size={17} />
                </span>
              </button>
            </div>
          </div>

          <section
            className='newapi-stack-stage'
            aria-label={t('new-api 接入预览')}
          >
            <div className='newapi-stack-stage__grain' aria-hidden='true' />
            <div className='newapi-stack-preview'>
              <div className='newapi-stack-preview__shine' aria-hidden='true' />

              <div className='newapi-stack-metric newapi-stack-metric--left'>
                <strong>40+</strong>
                <span>{t('供应商')}</span>
              </div>

              <div className='newapi-stack-metric newapi-stack-metric--right'>
                <strong>1 URL</strong>
                <span>{t('统一接入')}</span>
              </div>

              <div className='newapi-stack-access-card'>
                <div className='newapi-stack-access-card__meta'>
                  <Link2 size={16} />
                  <span>{t('接入 URL')}</span>
                </div>
                <button
                  type='button'
                  className='newapi-stack-access-card__copy'
                  onClick={handleCopyBaseURL}
                  aria-label={t('复制接入 URL')}
                >
                  <Copy size={18} />
                </button>
                <Text
                  ellipsis={{ showTooltip: true }}
                  className='newapi-stack-access-card__value'
                >
                  {normalizedServerAddress}
                </Text>
              </div>

              <div className='newapi-stack-endpoint'>
                <span>{t('当前端点')}</span>
                <Text
                  ellipsis={{ showTooltip: true }}
                  className='newapi-stack-endpoint__value'
                >
                  {currentEndpointUrl}
                </Text>
              </div>

              <div className='newapi-stack-provider-board'>
                {providerItems.slice(0, 8).map(({ label, Icon }, index) => (
                  <div
                    key={label}
                    className='newapi-stack-provider-tile'
                    style={{ '--provider-index': index }}
                  >
                    <Icon size={24} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className='newapi-stack-stage-controls'>
              <button
                type='button'
                className='newapi-stack-control newapi-stack-control--warm'
                onClick={handleCopyBaseURL}
              >
                <span>
                  <Copy size={16} />
                </span>
                {t('复制 URL')}
              </button>
              <Link
                to='/console'
                className='newapi-stack-control newapi-stack-control--cool'
              >
                {t('开始接入')}
                <span>
                  <ArrowUpRight size={16} />
                </span>
              </Link>
            </div>
          </section>
        </div>
      </section>

      <div className={`newapi-circle-menu ${ctaOpen ? 'is-open' : ''}`}>
        <div className='newapi-circle-menu__items' aria-hidden={!ctaOpen}>
          {radialQuickLinks.map((item) => {
            const { Icon } = item;
            const menuItem = (
              <>
                <span className='newapi-circle-menu__icon'>
                  <Icon size={17} />
                </span>
                <span className='newapi-circle-menu__label'>{item.label}</span>
              </>
            );

            return item.external ? (
              <a
                key={item.label}
                href={item.to}
                target='_blank'
                rel='noreferrer'
                className='newapi-circle-menu__item'
                style={item.style}
                tabIndex={ctaOpen ? 0 : -1}
              >
                {menuItem}
              </a>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className='newapi-circle-menu__item'
                style={item.style}
                tabIndex={ctaOpen ? 0 : -1}
              >
                {menuItem}
              </Link>
            );
          })}
        </div>

        <div className='newapi-circle-menu__hint' aria-hidden={!ctaOpen}>
          <Text className='!font-semibold'>{t('快捷入口')}</Text>
          <Paragraph className='!mb-0 !mt-1 !text-xs !text-semi-color-text-2'>
            {t('圆形菜单快速进入核心页面。')}
          </Paragraph>
        </div>

        <button
          type='button'
          className='newapi-circle-menu__trigger'
          onClick={() => setCtaOpen((prev) => !prev)}
          aria-expanded={ctaOpen}
          aria-label={ctaOpen ? t('收起快捷入口') : t('展开快捷入口')}
        >
          <span className='newapi-circle-menu__trigger-glow' />
          {ctaOpen ? <X size={22} /> : <Sparkles size={22} />}
          <span className='newapi-circle-menu__trigger-text'>
            {ctaOpen ? t('收起') : t('快捷')}
          </span>
        </button>
      </div>

    </div>
  );

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContent === '' ? (
        renderDefaultHome()
      ) : (
        <div className='overflow-x-hidden w-full'>
          {homePageContent.startsWith('https://') ? (
            <iframe
              ref={iframeRef}
              src={homePageContent}
              className='w-full h-screen border-none'
              onLoad={postIframeThemeAndLang}
            />
          ) : (
            <div
              className='mt-[60px]'
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, Check, Star, Menu, X, ChevronDown,
  Zap, Shield, Users, BarChart3, Globe, Sparkles,
  MessageSquare, Target, Calendar, Brain, Palette,
  Lock, Rocket, Sun, Moon, Monitor
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { cn } from '../utils/cn';

const EnhancedHome: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    }
  };

  const features = [
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: '실시간 팀 채팅',
      description: 'Slack 스타일의 직관적인 채팅으로 팀과 소통하세요. 파일 공유, 이모지 반응, 스레드 대화를 지원합니다.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'AI 업무 도우미',
      description: 'GPT-4와 Claude를 활용한 스마트한 업무 지원. 회의록 작성, 번역, 데이터 분석까지 한 번에.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: 'OKR 목표 관리',
      description: '팀의 목표를 체계적으로 관리하고 진행 상황을 실시간으로 추적하세요.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: '스마트 회의 관리',
      description: 'AI가 회의록을 자동으로 작성하고 액션 아이템을 추출합니다.',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: '성과 분석',
      description: '팀과 개인의 성과를 시각화하고 데이터 기반 의사결정을 내리세요.',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: '엔터프라이즈 보안',
      description: 'SOC2 준수, 256비트 암호화, 세밀한 권한 관리로 안전하게 협업하세요.',
      color: 'from-gray-600 to-gray-800',
    },
  ];

  const testimonials = [
    {
      name: '김지원',
      role: 'CTO, 테크스타트업',
      content: 'TeamPulse 덕분에 원격 팀 관리가 훨씬 쉬워졌습니다. AI 기능이 정말 혁신적이에요.',
      rating: 5,
      avatar: '👨‍💻',
    },
    {
      name: '박서연',
      role: 'Product Manager, 핀테크',
      content: '회의록 자동 작성 기능이 시간을 엄청나게 절약해줍니다. 강력 추천!',
      rating: 5,
      avatar: '👩‍💼',
    },
    {
      name: '이준호',
      role: 'CEO, 이커머스',
      content: 'OKR 관리와 성과 추적 기능으로 팀 생산성이 40% 향상되었습니다.',
      rating: 5,
      avatar: '👨‍💼',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '무료',
      description: '소규모 팀을 위한 기본 기능',
      features: [
        '최대 10명 팀원',
        '기본 채팅 기능',
        '5GB 저장 공간',
        'AI 도우미 (월 100회)',
        '기본 분석 대시보드',
      ],
      cta: '무료로 시작하기',
      popular: false,
    },
    {
      name: 'Professional',
      price: '₩15,000',
      unit: '/사용자/월',
      description: '성장하는 팀을 위한 고급 기능',
      features: [
        '무제한 팀원',
        '고급 채팅 & 화상회의',
        '100GB 저장 공간',
        'AI 도우미 (무제한)',
        '고급 분석 & 리포트',
        '우선 고객 지원',
        'SSO 통합',
      ],
      cta: '14일 무료 체험',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '문의',
      description: '대기업을 위한 맞춤형 솔루션',
      features: [
        'Professional의 모든 기능',
        '무제한 저장 공간',
        '전담 고객 성공 매니저',
        'SLA 보장',
        '커스텀 통합',
        '온프레미스 배포 가능',
        'HIPAA 준수',
      ],
      cta: '영업팀 문의',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Enhanced Header */}
      <motion.header 
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300",
          scrollY > 50 
            ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg" 
            : "bg-transparent"
        )}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <motion.div 
                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                TeamPulse
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                기능
              </a>
              <a href="#pricing" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                가격
              </a>
              <a href="#testimonials" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                고객 후기
              </a>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="테마 변경"
              >
                {theme === 'light' ? (
                  <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Monitor className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                )}
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/login')}
              >
                로그인
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
                onClick={() => navigate('/login')}
              >
                무료로 시작하기
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="메뉴"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="container mx-auto px-4 py-4 space-y-2">
                <a href="#features" className="block py-2 text-gray-700 dark:text-gray-300">
                  기능
                </a>
                <a href="#pricing" className="block py-2 text-gray-700 dark:text-gray-300">
                  가격
                </a>
                <a href="#testimonials" className="block py-2 text-gray-700 dark:text-gray-300">
                  고객 후기
                </a>
                <div className="pt-2 space-y-2">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => navigate('/login')}
                  >
                    로그인
                  </Button>
                  <Button
                    variant="primary"
                    fullWidth
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                    onClick={() => navigate('/login')}
                  >
                    무료로 시작하기
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section with Animation */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-1/2 w-80 h-80 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6"
            >
              <Zap className="w-4 h-4 mr-2" />
              AI 기반 차세대 협업 플랫폼
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6"
            >
              팀워크를 
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {' '}혁신하다
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed"
            >
              AI가 지원하는 스마트한 협업으로 팀의 생산성을 극대화하세요.
              <br />실시간 채팅, 목표 관리, 회의 자동화까지 한 곳에서.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                variant="primary"
                size="lg"
                icon={<Rocket className="w-5 h-5" />}
                onClick={() => navigate('/login')}
                className="shadow-xl hover:shadow-2xl"
              >
                무료로 시작하기
              </Button>
              <Button
                variant="outline"
                size="lg"
                icon={<Globe className="w-5 h-5" />}
                onClick={() => navigate('/demo')}
              >
                데모 체험하기
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 flex items-center justify-center space-x-8 text-gray-500 dark:text-gray-400"
            >
              <div className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                <span className="text-sm">SOC2 인증</span>
              </div>
              <div className="flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                <span className="text-sm">256비트 암호화</span>
              </div>
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                <span className="text-sm">10,000+ 팀 사용 중</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              강력한 기능으로 <span className="text-blue-600">업무 효율</span>을 높이세요
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              AI와 함께하는 스마트한 협업 도구로 팀의 잠재력을 최대한 발휘하세요
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  variant="elevated"
                  interactive
                  className="h-full group"
                >
                  <div className="p-6">
                    <div className={cn(
                      "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center text-white mb-4",
                      "group-hover:scale-110 transition-transform duration-300",
                      feature.color
                    )}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 lg:py-32 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              고객들이 <span className="text-purple-600">사랑하는</span> 이유
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              TeamPulse를 통해 성공을 거둔 팀들의 이야기를 들어보세요
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="default" className="h-full">
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center">
                      <div className="text-3xl mr-3">{testimonial.avatar}</div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {testimonial.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              모든 팀을 위한 <span className="text-green-600">합리적인 가격</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              팀 규모와 필요에 맞는 플랜을 선택하세요
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative",
                  plan.popular && "md:-mt-4"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      가장 인기
                    </span>
                  </div>
                )}
                <Card
                  variant={plan.popular ? "elevated" : "bordered"}
                  className={cn(
                    "h-full",
                    plan.popular && "ring-2 ring-blue-500"
                  )}
                >
                  <div className="p-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {plan.description}
                    </p>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {plan.price}
                      </span>
                      {plan.unit && (
                        <span className="text-gray-600 dark:text-gray-400 ml-2">
                          {plan.unit}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.popular ? "primary" : "outline"}
                      fullWidth
                      onClick={() => navigate('/login')}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              지금 바로 팀의 생산성을 높이세요
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              14일 무료 체험으로 TeamPulse의 모든 기능을 경험해보세요.
              <br />신용카드 등록 불필요.
            </p>
            <Button
              variant="secondary"
              size="xl"
              icon={<ArrowRight className="w-6 h-6" />}
              iconPosition="right"
              onClick={() => navigate('/login')}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              무료로 시작하기
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">TeamPulse</span>
              </div>
              <p className="text-sm">
                AI 기반 차세대 협업 플랫폼으로
                팀의 잠재력을 최대한 발휘하세요.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">제품</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">기능</a></li>
                <li><a href="#" className="hover:text-white transition-colors">가격</a></li>
                <li><a href="#" className="hover:text-white transition-colors">보안</a></li>
                <li><a href="#" className="hover:text-white transition-colors">로드맵</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">회사</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">소개</a></li>
                <li><a href="#" className="hover:text-white transition-colors">블로그</a></li>
                <li><a href="#" className="hover:text-white transition-colors">채용</a></li>
                <li><a href="#" className="hover:text-white transition-colors">문의</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">법적 고지</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-white transition-colors">개인정보처리방침</a></li>
                <li><a href="#" className="hover:text-white transition-colors">쿠키 정책</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 TeamPulse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EnhancedHome;
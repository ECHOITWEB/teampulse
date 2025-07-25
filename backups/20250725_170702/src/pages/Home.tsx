import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const features = [
    {
      icon: '💬',
      title: '팀별 공용 챗봇',
      description: '부서별 또는 프로젝트별로 AI와 협업하며, 팀원들과 인사이트를 공유하세요.',
      link: '/team-chat',
      color: 'from-blue-500 to-cyan-400',
      preview: '케이팝데몬헌터스 론처 전략 회의 진행 중'
    },
    {
      icon: '🎯',
      title: '1년 목표 관리',
      description: '연간 목표와 부서별 세부 목표를 한눈에 관리하고 진행 상황을 추적하세요.',
      link: '/goals',
      color: 'from-purple-500 to-pink-400',
      preview: '2024년 전체 목표 달성률 73%'
    },
    {
      icon: '📋',
      title: '부서별 업무 관리',
      description: '효율적인 프로젝트 관리와 업무 추적으로 팀의 생산성을 높이세요.',
      link: '/tasks',
      color: 'from-green-500 to-emerald-400',
      preview: '이번 주 12개 업무 진행 중'
    },
    {
      icon: '🤖',
      title: 'AI 업무 도구',
      description: '통합된 AI 도구로 업무 자동화와 효율성을 극대화하세요.',
      link: '/ai-tools',
      color: 'from-orange-500 to-red-400',
      preview: '6개의 AI 도구 사용 가능'
    }
  ];

  const stats = [
    { value: '500+', label: '활성 사용자' },
    { value: '95%', label: '업무 효율 향상' },
    { value: '24/7', label: 'AI 지원' },
    { value: '4.9', label: '고객 만족도' }
  ];

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Team<span className="text-primary">Pulse</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              팀의 협업 방식에 혁신을 가져오는 올인원 협업 플랫폼입니다.
              <br />
              분산된 업무 환경에서 발생하는 비효율을 해결하고,
              팀의 잠재력을 최대로 발휘하세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-8 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                대시보드 보기
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                to="/team-chat"
                className="inline-flex items-center px-8 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:border-primary hover:text-primary transition-colors duration-200"
              >
                팀 채팅 시작하기
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 -z-10 transform translate-x-1/2 -translate-y-1/2">
          <div className="w-96 h-96 bg-primary opacity-10 rounded-full blur-3xl"></div>
        </div>
        <div className="absolute bottom-0 left-0 -z-10 transform -translate-x-1/2 translate-y-1/2">
          <div className="w-96 h-96 bg-primary opacity-10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              팀의 성공을 위한 강력한 기능들
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              TeamPulse는 팀 협업의 모든 측면을 하나의 플랫폼에서 관리할 수 있도록 설계되었습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Link
                key={index}
                to={feature.link}
                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                <div className="p-8">
                  <div className="text-5xl mb-6">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <div className="text-sm text-primary font-medium">{feature.preview}</div>
                </div>
                <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${feature.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="bg-gradient-to-r from-primary to-primary-dark rounded-3xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              지금 바로 TeamPulse를 시작하세요
            </h2>
            <p className="text-lg mb-8 opacity-90">
              팀의 협업 효율을 극대화하고 목표를 달성하세요.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-8 py-3 rounded-lg bg-white text-primary font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-lg"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
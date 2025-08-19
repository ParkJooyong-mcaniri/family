import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Zap, 
  Shield, 
  Users, 
  Clock, 
  TrendingUp,
  CheckCircle,
  ArrowRight
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "실시간 분석",
    description: "데이터를 실시간으로 분석하여 즉시 인사이트를 얻으세요.",
    badge: "인기",
    color: "bg-blue-100 text-blue-800"
  },
  {
    icon: Zap,
    title: "빠른 성능",
    description: "최적화된 아키텍처로 빠르고 안정적인 서비스를 제공합니다.",
    badge: "신규",
    color: "bg-green-100 text-green-800"
  },
  {
    icon: Shield,
    title: "엔터프라이즈 보안",
    description: "SOC 2 Type II 인증으로 데이터 보안을 보장합니다.",
    badge: "보안",
    color: "bg-purple-100 text-purple-800"
  },
  {
    icon: Users,
    title: "팀 협업",
    description: "팀원들과 실시간으로 협업하고 프로젝트를 관리하세요.",
    badge: "협업",
    color: "bg-orange-100 text-orange-800"
  },
  {
    icon: Clock,
    title: "24/7 모니터링",
    description: "시스템을 24시간 모니터링하여 안정성을 보장합니다.",
    badge: "모니터링",
    color: "bg-red-100 text-red-800"
  },
  {
    icon: TrendingUp,
    title: "성장 분석",
    description: "비즈니스 성장을 추적하고 최적화할 수 있는 도구를 제공합니다.",
    badge: "분석",
    color: "bg-indigo-100 text-indigo-800"
  }
];

export function Features() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            강력한 기능들
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            비즈니스 성공을 위한 모든 도구를 제공합니다. 
            직관적이고 강력한 기능으로 당신의 팀을 지원합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors">
                    <feature.icon className="h-6 w-6 text-gray-700 group-hover:text-blue-600" />
                  </div>
                  <Badge className={feature.color}>{feature.badge}</Badge>
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                  자세히 보기
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 bg-blue-50 rounded-full px-6 py-3">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 font-medium">
              30일 무료 체험으로 모든 기능을 경험해보세요
            </span>
          </div>
        </div>
      </div>
    </section>
  );
} 
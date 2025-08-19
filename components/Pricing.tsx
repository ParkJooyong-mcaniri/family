import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "₩29,000",
    period: "월",
    description: "개인 사용자와 소규모 팀을 위한 기본 기능",
    features: [
      "최대 5명의 팀원",
      "기본 분석 도구",
      "이메일 지원",
      "10GB 저장 공간",
      "기본 템플릿"
    ],
    popular: false,
    cta: "무료로 시작하기"
  },
  {
    name: "Professional",
    price: "₩99,000",
    period: "월",
    description: "성장하는 비즈니스를 위한 고급 기능",
    features: [
      "무제한 팀원",
      "고급 분석 도구",
      "우선 지원",
      "100GB 저장 공간",
      "고급 템플릿",
      "API 접근",
      "사용자 정의 브랜딩"
    ],
    popular: true,
    cta: "인기 플랜"
  },
  {
    name: "Enterprise",
    price: "문의",
    period: "",
    description: "대규모 조직을 위한 맞춤형 솔루션",
    features: [
      "무제한 팀원",
      "모든 고급 기능",
      "전담 지원 매니저",
      "무제한 저장 공간",
      "맞춤형 통합",
      "SLA 보장",
      "온프레미스 배포 옵션"
    ],
    popular: false,
    cta: "문의하기"
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            투명한 가격 정책
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            비즈니스 규모에 맞는 최적의 플랜을 선택하세요. 
            30일 무료 체험으로 모든 기능을 경험해보세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${
                plan.popular 
                  ? 'border-blue-500 shadow-xl scale-105' 
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    가장 인기
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600">
                  {plan.description}
                </CardDescription>
                <div className="mt-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-600 ml-1">/{plan.period}</span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            자주 묻는 질문
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                언제든지 플랜을 변경할 수 있나요?
              </h4>
              <p className="text-gray-600">
                네, 언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 
                변경사항은 다음 결제 주기부터 적용됩니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                무료 체험 기간이 있나요?
              </h4>
              <p className="text-gray-600">
                모든 플랜에 30일 무료 체험이 포함되어 있습니다. 
                신용카드 정보 없이도 모든 기능을 경험할 수 있습니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                환불 정책은 어떻게 되나요?
              </h4>
              <p className="text-gray-600">
                첫 30일 이내에 100% 환불을 보장합니다. 
                만족하지 않으시면 언제든지 환불해드립니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                기술 지원은 어떻게 받을 수 있나요?
              </h4>
              <p className="text-gray-600">
                이메일, 채팅, 전화를 통해 24/7 기술 지원을 제공합니다. 
                Enterprise 플랜 고객은 전담 지원 매니저를 제공받습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 
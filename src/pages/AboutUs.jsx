import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 900px;
  margin: 80px auto;
  padding: 40px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  line-height: 1.6;
  color: #333;
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h2`
  font-size: 28px;
  margin-bottom: 16px;
  color: #1A3D4D;
`;

const Subtitle = styled.h3`
  font-size: 22px;
  margin-bottom: 12px;
  color: #1A3D4D;
`;

const List = styled.ul`
  list-style: none;
  padding-left: 0;
  margin-top: 12px;

  li {
    margin-bottom: 8px;
    &:before { content: "✅ "; }
  }
`;

const StatsGrid = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 20px;
`;

const StatCard = styled.div`
  flex: 1;
  min-width: 180px;
  background: #f0f4f7;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: #f0ae00;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 16px;
  color: #1A3D4D;
`;


const TEXT = {
  en: {
    title: 'About Us',
    intro:
      "At Residence, we believe that finding the perfect home is more than a transaction — it's a life-changing experience. Since our foundation, we have been committed to redefining the way people approach real estate by combining personalized service, deep market expertise, and innovative solutions tailored to every client’s needs.",
    whoTitle: 'Who We Are',
    who:
      'Residence is a full-service real estate company specializing in residential and commercial properties, offering buying, selling, and rental services as well as investment consulting and legal assistance. With a handpicked team of experienced agents, legal experts, and customer care specialists, we guide our clients through every step of their real estate journey with clarity and confidence.',
    visionTitle: 'Our Vision',
    vision:
      'To become the most trusted name in real estate by delivering unmatched quality, transparency, and a human-centered approach — making every real estate experience effortless and empowering.',
    missionTitle: 'Our Mission',
    missionPoints: [
      'To help individuals and families find not just a property, but a place to belong.',
      'To support investors and developers with accurate data, market insights, and professional guidance.',
      'To uphold the highest ethical standards in all our transactions and communications.',
    ],
    offerTitle: 'What We Offer',
    offerList: [
      'Extensive portfolio of verified properties',
      'Customized property search based on your goals',
      'End-to-end legal and administrative support',
      'Assistance with mortgage and financing',
      'After-sales services and property management options',
    ],
    whyTitle: 'Why Choose Residence?',
    whyP1:
      "We go beyond traditional real estate practices. At Residence, you’re not just a client — you're a partner. Whether you're buying your first apartment, relocating, investing in rental property, or selling a family home, we take the time to understand your story and provide expert solutions tailored to your future.",
    whyP2:
      'With a reputation built on trust, integrity, and results, Residence has become a go-to name for individuals and businesses seeking a seamless and rewarding real estate experience.',
    statsTitle: 'Our Statistics',
    statSold: 'Houses Sold',
    statRented: 'Homes Rented',
    statHappy: 'Happy Clients',
    statManaged: 'Managed Properties',
  },
  ru: {
    title: 'О нас',
    intro:
      'В Residence мы считаем, что поиск идеального дома — это больше, чем сделка; это опыт, меняющий жизнь. С момента основания мы стремимся переосмыслить подход к недвижимости, сочетая персональный сервис, глубокую экспертизу рынка и инновационные решения, адаптированные под потребности каждого клиента.',
    whoTitle: 'Кто мы',
    who:
      'Residence — агентство полного цикла, специализирующееся на жилой и коммерческой недвижимости. Мы предоставляем услуги покупки, продажи и аренды, а также инвестиционное консультирование и юридическое сопровождение. С отобранной командой опытных агентов, юристов и специалистов по клиентскому сервису мы сопровождаем клиентов на каждом этапе их пути с ясностью и уверенностью.',
    visionTitle: 'Наше видение',
    vision:
      'Стать самым надёжным именем на рынке недвижимости, обеспечивая непревзойдённое качество, прозрачность и человеко-ориентированный подход — делая каждый опыт с недвижимостью простым и уверенным.',
    missionTitle: 'Наша миссия',
    missionPoints: [
      'Помогать людям и семьям находить не просто объект, а место, где можно быть дома.',
      'Поддерживать инвесторов и девелоперов точными данными, рыночной аналитикой и профессиональными рекомендациями.',
      'Соблюдать высочайшие этические стандарты во всех наших сделках и коммуникациях.',
    ],
    offerTitle: 'Что мы предлагаем',
    offerList: [
      'Большое портфолио проверенных объектов',
      'Индивидуальный подбор недвижимости под ваши цели',
      'Полное юридическое и административное сопровождение',
      'Помощь с ипотекой и финансированием',
      'Послепродажный сервис и варианты управления недвижимостью',
    ],
    whyTitle: 'Почему выбирают Residence?',
    whyP1:
      'Мы выходим за рамки традиционных практик. В Residence вы — не просто клиент, вы — партнёр. Покупаете первую квартиру, переезжаете, инвестируете в аренду или продаёте семейный дом — мы понимаем вашу историю и предлагаем решения, ориентированные на будущее.',
    whyP2:
      'Благодаря репутации, основанной на доверии, честности и результатах, Residence стал надёжным выбором для частных и корпоративных клиентов, которым важен комфортный и успешный опыт.',
    statsTitle: 'Наша статистика',
    statSold: 'Проданных домов',
    statRented: 'Сданных объектов',
    statHappy: 'Довольных клиентов',
    statManaged: 'Объектов под управлением',
  },
  hy: {
    title: 'Մեր մասին',
    intro:
      'Residence-ում վստահ ենք, որ իդեալական տուն գտնելը պարզապես գործարք չէ․ դա կյանքի փոփոխող փորձ է։ Սկզբից ի վեր մենք ձգտում ենք վերանայել անշարժ գույքի ոլորտի մոտեցումները՝ համադրելով անհատական սպասարկում, շուկայի խորքային փորձագիտություն և յուրաքանչյուր հաճախորդի կարիքներին համապատասխան նորարարական լուծումներ։',
    whoTitle: 'Մենք ով ենք',
    who:
      'Residence-ը ամբողջական ծառայություններով գործակալություն է, որը մասնագիտանում է բնակելի և առեւտրային գույքերում։ Մենք առաջարկում ենք գնում, վաճառք և վարձակալություն, ինչպես նաև ներդրումային խորհրդատվություն և իրավական աջակցություն։ Փորձառու գործակալների, իրավաբանների և հաճախորդների սպասարկման մասնագետների թիմով մենք ուղեկցում ենք հաճախորդներին ամեն քայլում՝ պարզ ու վստահելի։',
    visionTitle: 'Տեսլականը',
    vision:
      'Դառնալ ամենահուսալի անունը անշարժ գույքի ոլորտում՝ ապահովելով անզիջում որակ, թափանցիկություն և մարդակենտրոն մոտեցում՝ դարձնելով յուրաքանչյուր փորձ հնարավորինս հեշտ և վստահելի։',
    missionTitle: 'Առաքելությունը',
    missionPoints: [
      'Օգնել անհատներին և ընտանիքներին գտնել ոչ միայն գույք, այլ նաև տուն։',
      'Աջակցել ներդրողներին և մշակողներին ճշգրիտ տվյալներով, շուկայի պատկերացումներով ու մասնագիտական խորհրդատվությամբ։',
      'Պահպանել ամենաբարձր էթիկական չափանիշները բոլոր գործարքներում և հաղորդակցությունում։',
    ],
    offerTitle: 'Ինչ ենք առաջարկում',
    offerList: [
      'Ստուգված գույքերի լայն ընտրանի',
      'Անհատականացված որոնում՝ ձեր նպատակներին համապատասխան',
      'Լիարժեք իրավական և վարչական աջակցություն',
      'Օգնություն հիպոթեքի և ֆինանսավորման հարցերում',
      'Վաճառքից հետո սպասարկում և գույքի կառավարման տարբերակներ',
    ],
    whyTitle: 'Ինչու ընտրել Residence-ը',
    whyP1:
      'Մենք անցնում ենք ավանդական մոտեցումից այն կողմ։ Residence-ում դուք պարզապես հաճախորդ չէք՝ դուք գործընկեր եք։ Անկախ նրանից՝ առաջին բնակարանն եք գնում, փոխվում եք, ներդրում եք կատարում կամ վաճառում եք ընտանեկան տունը, մենք հասկանում ենք ձեր պատմությունը և առաջարկում ենք ապագային համընթաց լուծումներ։',
    whyP2:
      'Վստահության, ազնվության և արդյունքի վրա հիմնված մեր անունը Residence-ը դարձրել է վստահելի ընտրություն նրանց համար, ովքեր ցանկանում են հարթ և արդյունավետ փորձ անշարժ գույքի ոլորտում։',
    statsTitle: 'Մեր վիճակագրությունը',
    statSold: 'Վաճառված տներ',
    statRented: 'Վարձակալված գույք',
    statHappy: 'Բավականացած հաճախորդներ',
    statManaged: 'Կառավարվող գույք',
  },
};

const AboutUs = () => {

  const [lang, setLang] = useState(
    document.documentElement.lang || localStorage.getItem('lang') || 'en'
  );


  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'lang') {
          setLang(el.lang || 'en');
        }
      }
    });
    observer.observe(el, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const t = TEXT[lang] || TEXT.en;

  return (
    <Container>
      <Section>
        <Title>{t.title}</Title>
        <p>{t.intro}</p>
      </Section>

      <Section>
        <Subtitle>{t.whoTitle}</Subtitle>
        <p>{t.who}</p>
      </Section>

      <Section>
        <Subtitle>{t.visionTitle}</Subtitle>
        <p>{t.vision}</p>
      </Section>

      <Section>
        <Subtitle>{t.missionTitle}</Subtitle>
        {t.missionPoints.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </Section>

      <Section>
        <Subtitle>{t.offerTitle}</Subtitle>
        <List>
          {t.offerList.map((li, i) => <li key={i}>{li}</li>)}
        </List>
      </Section>

      <Section>
        <Subtitle>{t.whyTitle}</Subtitle>
        <p>{t.whyP1}</p>
        <p>{t.whyP2}</p>
      </Section>

      <Section>
        <Subtitle>{t.statsTitle}</Subtitle>
        <StatsGrid>
          <StatCard>
            <StatNumber>320+</StatNumber>
            <StatLabel>{t.statSold}</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>210+</StatNumber>
            <StatLabel>{t.statRented}</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>500+</StatNumber>
            <StatLabel>{t.statHappy}</StatLabel>
          </StatCard>
          <StatCard>
            <StatNumber>75+</StatNumber>
            <StatLabel>{t.statManaged}</StatLabel>
          </StatCard>
        </StatsGrid>
      </Section>
    </Container>
  );
};

export default AboutUs;



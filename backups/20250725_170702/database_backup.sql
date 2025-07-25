-- MySQL dump 10.13  Distrib 8.0.42, for Linux (aarch64)
--
-- Host: localhost    Database: teampulse
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `api_usage`
--

DROP TABLE IF EXISTS `api_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_usage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `api_type` varchar(50) DEFAULT NULL,
  `tokens_used` int DEFAULT NULL,
  `cost_estimate` decimal(10,6) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_date` (`user_id`,`created_at`),
  CONSTRAINT `api_usage_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_usage`
--

LOCK TABLES `api_usage` WRITE;
/*!40000 ALTER TABLE `api_usage` DISABLE KEYS */;
INSERT INTO `api_usage` VALUES (1,1,'chat_completion',50,0.001000,'2025-07-23 07:51:42'),(2,1,'chat_completion',982,0.019640,'2025-07-23 07:53:46'),(3,1,'chat_completion',896,0.017920,'2025-07-23 07:54:38'),(4,1,'chat_completion',978,0.019560,'2025-07-23 07:59:43'),(5,1,'chat_completion',1040,0.020800,'2025-07-23 08:14:14'),(6,1,'chat_completion',903,0.018060,'2025-07-23 08:15:00'),(7,1,'chat_completion',279,0.005580,'2025-07-25 01:10:15'),(8,1,'chat_completion',1019,0.020380,'2025-07-25 01:17:23');
/*!40000 ALTER TABLE `api_usage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `role` enum('user','assistant','system') NOT NULL,
  `content` text NOT NULL,
  `file_info` json DEFAULT NULL,
  `tokens_used` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session_created` (`session_id`,`created_at`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,7,'user','Hello, this is a test message',NULL,0,'2025-07-23 07:51:30'),(2,7,'assistant','Hello! How can I help you today?',NULL,50,'2025-07-23 07:51:42'),(3,11,'user','파일을 분석해주세요.','{\"name\": \"이력서_이희성.pdf\", \"type\": \"application/pdf\"}',0,'2025-07-23 07:53:13'),(4,11,'assistant','이 파일은 \"이희성\"이라는 인물의 이력서 및 자기소개서를 담고 있는 문서입니다. 주요 내용을 분석하면 다음과 같습니다.\n\n1. **개인 정보**\n   - 이름: 이희성 (LEE Hee Sung)\n   - 생년월일: 2001년 1월 24일\n   - 연락처: 010-6664-8150\n   - 이메일: Ayanar0124@naver.com\n   - 주소: 경상북도 고령군 대가야읍 지산길 7 201호\n\n2. **지원 정보**\n   - 지원 회사: 에코아이티\n   - 지원 부문: 사업기획본부 플랫폼 서비스기획부문\n\n3. **직무역량**\n   - 영어 능숙 및 비즈니스 커뮤니케이션 능력 보유\n   - 대규모 다문화 행사 기획 및 실행 경험\n   - 위챗 소셜미디어를 통한 마케팅 성공 사례\n   - 대학 전공 강의 및 세미나 발표 경험\n   - 데이터 분석 및 보고서 작성 능력\n   - AI 도구 및 AI 기술 활용 능력\n\n4. **경력사항**\n   - HOBBYTAN AI 인턴: AI 서비스 기획 및 개발\n   - Ernst & Young: 동남아 전기오토바이 전략 개발 프로젝트\n   - 노팅엄 대학교 닝보 캠퍼스 한인학생회 부회장 및 대외활동\n   - 한국어과 조교: 한국어 및 한국 문화 교육\n\n5. **학력사항**\n   - 노팅엄 대학교 닝보 캠퍼스 (UNNC)\n   - 학점: 3.47/4.5\n   - 전공: 응용언어학\n\n6. **자기소개서**\n   - 지원동기: 플랫폼의 본질 이해 및 AI 기술에 대한 관심과 전문성 강조\n   - 업무상 강점: 다양한 업무 경험을 통한 멀티플레이어 능력 및 긍정적인 팀워크\n\n이 문서를 통해 이희성은 다양한 경험과 능력을 보유한 인재임을 강조하고 있으며, 특히 AI 및 플랫폼 서비스 기획에 관심이 많으며 이에 대한 전문성을 가지고 있다고 합니다. 또한, 다문화 이벤트 기획, 데이터 분석, AI 도구 활용 등 다양한 역량을 보유하고 있으며, 이를 통해 지원하는 회사에서 기여하고자 하는 의지를 보여줍니다.',NULL,982,'2025-07-23 07:53:46'),(5,11,'user','이 인재를 어떤 직무에 활용하면 좋을까? 해온 것과 업무에 대한 태도를 봤을 때',NULL,0,'2025-07-23 07:54:10'),(6,11,'assistant','이희성의 경험과 역량을 고려할 때, 다음과 같은 직무에 활용하는 것이 좋을 것으로 보입니다.\n\n1. **플랫폼 서비스 기획 부문**\n   - 이희성은 AI 서비스 기획 및 개발에 대한 인턴 경험이 있으며, 플랫폼의 본질 이해에 대한 강한 관심과 전문성을 보여주었습니다. 이러한 경험은 플랫폼 서비스 기획에 있어서 중요한 자산이 될 수 있습니다. 사용자 경험(UX) 개선, 신규 서비스 기획 또는 기존 서비스의 개선 작업에 큰 기여를 할 수 있을 것입니다.\n\n2. **글로벌 마케팅 및 커뮤니케이션 부문**\n   - 다양한 문화적 배경을 가진 사람들과의 행사 기획 및 실행 경험, 그리고 위챗을 통한 마케팅 성공 사례는 글로벌 마케팅 역량을 보여줍니다. 이러한 경험은 다국적 사용자 기반을 가진 기업에서 국제 마케팅 전략 수립 및 실행에 큰 도움이 될 수 있습니다.\n\n3. **데이터 분석 및 전략 기획 부문**\n   - 데이터 분석 및 보고서 작성 능력은 기업의 의사결정 과정에서 중요한 역할을 합니다. 이희성은 데이터를 기반으로 한 분석 및 전략 수립에 기여할 수 있으며, 특히 경영 전략 또는 사업 개발 부문에서 중요한 자산이 될 수 있습니다.\n\n4. **다문화 팀 관리 및 대외협력 부문**\n   - 대학에서의 다양한 대외활동 및 리더십 경험은 조직 내 다문화 팀의 관리 및 대외협력에 있어서 유용할 수 있습니다. 특히 글로벌 시장에서의 협업이 중요한 기업에 있어서는 이희성의 다문화 이해도 및 커뮤니케이션 능력이 큰 장점으로 작용할 수 있습니다.\n\n이희성의 다양한 경험과 업무에 대한 태도는 팀워크를 중시하고, 다양한 상황에서도 유연하게 대처할 수 있는 능력을 보여줍니다. 따라서, 혁신을 추구하며 다양한 문화적 배경을 가진 팀원들과 함께 일하는 환경에서 빛을 발할 수 있을 것으로 기대됩니다.',NULL,896,'2025-07-23 07:54:38'),(7,16,'user','파일을 분석해주세요.','{\"name\": \"이력서_이희성.pdf\", \"type\": \"application/pdf\"}',0,'2025-07-23 07:59:14'),(8,16,'assistant','이 파일은 \"이희성\"이라는 인물의 이력서 및 자기소개서로 구성되어 있습니다. 이희성은 2001년 1월 24일생으로, 연락처와 이메일 주소, 경상북도 고령군 대가야읍에 위치한 주소가 명시되어 있습니다. 지원 회사는 에코아이티이며, 사업기획본부 플랫폼 서비스기획부문에 지원하였습니다.\n\n### 직무역량\n이희성은 여러 강점을 보유하고 있음을 밝혔습니다. 이러한 강점에는 영어 능통, 대규모 다문화 행사 기획 및 실행, 위챗을 통한 마케팅 성공, 대학 전공 강의 및 세미나 PT 발표 경험, 꼼꼼한 데이터 분석 및 보고서 작성 능력, 그리고 AI 도구 및 전자 기기 활용 능력이 포함됩니다.\n\n### 경력사항\nHOBBYTAN AI 인턴으로 AI 서비스 기획 및 개발에 관여하였고, Ernst & Young에서 동남아 전기오토바이 시장 조사 및 분석 등을 담당하였습니다. 이희성은 해당 경험을 통해 다양한 성과를 이루어냈습니다.\n\n### 학력사항\n노팅엄 대학교 닝보 캠퍼스에서 응용언어학을 전공하였으며, 2025년에 졸업할 예정입니다. 학점은 3.47/4.5입니다.\n\n### 리더십 경험\n한인학생회 부회장으로 활동하였고, 교내 행사 매니저로도 역할을 수행하였습니다. 이를 통해 리더십과 조직 내 역할 분배 및 진척 상황 검토 능력을 갖추었습니다.\n\n### 자기소개서\n지원 동기에서는 플랫폼 서비스 기획의 중요성과 자신의 관련 경험을 강조합니다. AI와 LLM에 대한 깊은 관심을 밝히며, 에코아이티에서의 역할을 통해 이를 실현하고자 하는 의지를 표현합니다. 또한, 다양한 업무 경험을 통한 멀티태스킹 능력과 긍정적인 평가를 받은 경험을 소개하여 자신의 업무 능력과 팀 내 기여도를 강조합니다.\n\n종합적으로 볼 때, 이 파일은 이희성의 직무 관련 역량, 경력 사항, 학력 및 리더십 경험, 그리고 지원 동기와 업무상 강점을 상세히 설명하고 있습니다. 이희성은 다양한 경험과 역량을 바탕으로 에코아이티의 사업기획본부 플랫폼 서비스기획부문에서 기여하고자 합니다.',NULL,978,'2025-07-23 07:59:43'),(9,18,'user','파일을 분석해주세요.','{\"name\": \"이력서_이희성.pdf\", \"type\": \"application/pdf\"}',0,'2025-07-23 08:13:45'),(10,18,'assistant','이 파일은 \"LEE Hee Sung\"이라는 인물의 이력서와 자기소개서를 담고 있습니다. 해당 문서는 개인의 기본 정보, 경력, 학력, 리더십 경험, 경력 기술서, 그리고 자기소개서로 구성되어 있습니다. 이 내용을 바탕으로 상세한 분석을 제공하겠습니다.\n\n### 개인 정보\n- 이름: 이희성 (LEE Hee Sung)\n- 생년월일: 2001년 1월 24일\n- 연락처: 010-6664-8150\n- 이메일: Ayanar0124@naver.com\n- 주소: 경상북도 고령군 대가야읍 지산길 7-201호\n- 지원 회사: 에코아이티\n- 지원 부문: 사업기획본부 플랫폼 서비스기획부문\n\n### 직무 역량\n- 영어 비즈니스 커뮤니케이션 능력\n- 대규모 다문화 행사 기획 및 실행\n- 위챗 소셜미디어 마케팅 경험\n- 대학 전공 강의 및 세미나 PT 발표 경험\n- 데이터 분석 및 보고서 작성 능력\n- AI 툴 및 AI 기술 활용 능력\n\n### 경력 사항\n- HOBBYTAN AI 인턴, AI 서비스 기획 및 개발 참여\n- Ernst & Young, 동남아 전기오토바이 전략 개발 프로젝트 참가자\n- 노팅엄대학교 닝보 캠퍼스 한인학생회 부회장 및 대외활동, 학생회 행사 기획 및 운영\n\n### 학력 사항\n- 노팅엄 대학교 닝보 캠퍼스, 응용언어학 전공, 학점 3.47/4.5\n\n### 자기소개서\n이희성은 플랫폼의 본질과 중요성을 이해하고, AI와 LLM에 대한 깊은 관심을 바탕으로 새로운 가치 창출과 기술 발전에 기여하고자 합니다. 특히, 에코아이티의 사업기획본부에서 IA 기술을 활용한 신사업 개발과 고객 솔루션의 고도화에 기여하고자 합니다. 그는 뛰어난 멀티플레이어로서의 역량과 해외 현지에서의 경험을 통해 팀의 업무 효율을 증대시키고 긍정적인 평가를 받은 바 있습니다.\n\n### 분석 결론\n이희성은 다양한 경험과 뛰어난 커뮤니케이션 능력을 바탕으로 에코아이티의 사업기획본부에서 플랫폼 서비스 기획에 크게 기여할 수 있는 잠재력을 가진 인재입니다. 그의 AI 및 기술에 대한 깊은 이해와 국제적인 경험은 회사의 글로벌 비즈니스 전략 개발에도 도움이 될 것으로 보입니다.',NULL,1040,'2025-07-23 08:14:14'),(11,18,'user','이 인원에게 알맞는 직군을 추천해줄래?',NULL,0,'2025-07-23 08:14:41'),(12,18,'assistant','이희성 씨의 이력과 경력, 그리고 자기소개서 내용을 바탕으로, 그에게 알맞는 직군을 추천드리겠습니다.\n\n### 1. 플랫폼 서비스 기획\n- 이희성 씨는 AI 기술을 활용한 신사업 개발과 고객 솔루션의 고도화에 기여하고자 하는 열정을 가지고 있습니다. 이는 플랫폼 서비스 기획 분야에서 중요한 역량 중 하나입니다. 또한, 다양한 문화적 배경을 가진 사용자들을 위한 서비스 기획과 개선 작업에 큰 이점을 가져다줄 수 있습니다.\n\n### 2. 글로벌 비즈니스 전략\n- 이희성 씨는 해외에서의 경험과 영어 비즈니스 커뮤니케이션 능력을 갖추고 있어, 글로벌 마켓을 대상으로 하는 비즈니스 전략 개발에 적합한 인재입니다. 다양한 국가와 문화에 대한 이해도가 높아, 글로벌 시장 진출 전략이나 해외 협력사와의 커뮤니케이션에서 큰 강점을 발휘할 수 있습니다.\n\n### 3. 데이터 분석 및 인사이트 개발\n- 데이터 분석 및 보고서 작성 능력을 보유하고 있으며, AI 툴 및 기술 활용 능력도 갖추고 있습니다. 이는 데이터 분석을 통해 비즈니스 인사이트를 도출하고, 이를 기반으로 전략을 수립하는 역할에 적합합니다. 마케팅, 제품 개발, 고객 경험 개선 등 다양한 부문에서 데이터 기반 의사결정을 지원할 수 있습니다.\n\n### 4. 다문화 커뮤니케이션 및 마케팅\n- 다문화 행사 기획 및 실행 경험과 위챗 소셜미디어 마케팅 경험을 보유하고 있어, 다양한 문화권의 사용자를 대상으로 하는 마케팅 전략 수립 및 실행에 적합합니다. 국내외 다양한 고객층에 맞는 맞춤형 마케팅 캠페인을 기획하고 실행할 수 있는 능력을 가지고 있습니다.\n\n이희성 씨의 다양한 경험과 역량을 고려할 때, 위의 직군들이 그의 잠재력을 최대한 발휘할 수 있는 분야로 보입니다. 각 직군에서 그의 역량과 경험을 바탕으로 큰 성과를 낼 수 있을 것으로 기대됩니다.',NULL,903,'2025-07-23 08:15:00'),(13,19,'user','너에 대해 설명해줄래?',NULL,0,'2025-07-25 01:10:02'),(14,19,'assistant','네, 제가 설명해 드리겠습니다. 저는 TeamPulse AI라고 하는, 다양한 직장 내 업무를 지원하기 위해 설계된 인공지능 기반의 도우미입니다. 문서 작성, 데이터 분석, 일정 관리, 의사소통 개선 등 직장에서 필요한 다방면의 업무를 보조하고, 팀의 생산성을 향상시키는 것을 목적으로 합니다. 언어 이해와 생성, 복잡한 문제 해결 능력을 가지고 있어 사용자의 질문에 신속하고 정확하게 응답할 수 있습니다. 어떤 업무를 도와드릴 수 있을지 말씀해 주시면, 저의 기능을 최대한 활용하여 지원하겠습니다.',NULL,279,'2025-07-25 01:10:15'),(15,20,'user','파일을 분석해주세요.','{\"name\": \"이력서_이희성.pdf\", \"type\": \"application/pdf\"}',0,'2025-07-25 01:16:52'),(16,20,'assistant','이 파일은 \"LEE Hee Sung\"이라는 개인의 이력서 및 자기소개서를 담고 있습니다. 이 문서는 개인의 기본 정보, 교육 경력, 지원 동기, 업무상 강점 등을 포함하여 그의 전문성과 역량을 강조하는 내용을 담고 있습니다. \n\n### 기본 정보\n- 이름: 이희성 (LEE Hee Sung)\n- 생년월일: 2001년 1월 24일\n- 연락처: 010-6664-8150\n- 이메일: Ayanar0124@naver.com\n- 주소: 경상북도 고령군 대가야읍 지산길 7 201호\n\n### 교육 및 경력\n- 노팅엄 대학교 닝보 캠퍼스에서 응용언어학 전공, 학점 3.47/4.5로 2025년 졸업 예정입니다.\n- 한인학생회 부회장, 교내 행사 매니저 등 리더십 경험 보유.\n- HOBBYTAN AI와 Ernst & Young에서 인턴 및 시장조사 담당으로 경력을 쌓았습니다.\n\n### 업무 역량 및 성과\n- 영어 능숙, 다문화 행사 기획, 위챗 소셜미디어 마케팅, 데이터 분석, AI 도구 활용 능력 보유.\n- AI 서비스 기획과 관련하여 Vibe-coding 기술을 활용한 신규 서비스 개발 경험.\n- 동남아 시장 전기 오토바이 시장조사 및 분석을 통해 인도네시아 시장 점유율 파악 등의 주요 성과 달성.\n\n### 지원 동기 및 업무상 강점\n- 플랫폼의 본질적 가치와 AI 및 LLM에 대한 깊은 관심으로 에코아이티 사업기획본부의 플랫폼 서비스기획부문에 지원.\n- 멀티태스킹과 소통 능력을 강점으로 내세우며, 이를 통해 해외 출장 중 팀의 일정 관리 및 여러 업무를 성공적으로 수행한 경험을 강조.\n\n### 분석\n이 이력서 및 자기소개서는 이희성 씨가 사업기획 및 플랫폼 서비스 기획 분야에서의 전문성과 업무 수행 능력을 강조하고 있습니다. 특히, AI 기술과 글로벌 비즈니스 환경에 대한 이해도가 높으며, 다양한 프로젝트와 팀 활동을 통해 실제 업무 경험을 쌓았음을 드러내고 있습니다. 또한, 그의 다재다능함과 리더십, 해외 경험을 통한 글로벌 시각 등은 플랫폼 서비스 기획 업무를 수행함에 있어 큰 자산이 될 것으로 보입니다.',NULL,1019,'2025-07-25 01:17:23');
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_sessions`
--

DROP TABLE IF EXISTS `chat_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `tool_type` varchar(50) NOT NULL,
  `session_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_tool` (`user_id`,`tool_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `chat_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_sessions`
--

LOCK TABLES `chat_sessions` WRITE;
/*!40000 ALTER TABLE `chat_sessions` DISABLE KEYS */;
INSERT INTO `chat_sessions` VALUES (1,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:42:09','2025-07-23 07:42:09'),(2,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:42:09','2025-07-23 07:42:09'),(3,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:42:23','2025-07-23 07:42:23'),(4,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:42:23','2025-07-23 07:42:23'),(5,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:42:28','2025-07-23 07:42:28'),(6,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:42:28','2025-07-23 07:42:28'),(7,1,'teampulse_ai','Test Chat','2025-07-23 07:46:48','2025-07-23 07:51:42'),(8,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:53:06','2025-07-23 07:53:06'),(9,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:53:06','2025-07-23 07:53:06'),(10,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:53:08','2025-07-23 07:53:08'),(11,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:53:08','2025-07-23 07:54:38'),(12,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:54:52','2025-07-23 07:54:52'),(13,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:54:52','2025-07-23 07:54:52'),(14,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:56:02','2025-07-23 07:56:02'),(15,1,'teampulse_ai','TeamPulse AI Chat','2025-07-23 07:56:02','2025-07-23 07:56:02'),(16,1,'teampulse_ai','대화 2025. 7. 23. 오후 04:59','2025-07-23 07:59:10','2025-07-23 07:59:43'),(17,1,'teampulse_ai','대화 2025. 7. 23. 오후 05:00','2025-07-23 08:00:36','2025-07-23 08:00:36'),(18,1,'teampulse_ai','대화 2025. 7. 23. 오후 05:13','2025-07-23 08:13:45','2025-07-23 08:15:00'),(19,1,'teampulse_ai','대화 2025. 7. 25. 오전 10:10','2025-07-25 01:10:02','2025-07-25 01:10:15'),(20,1,'teampulse_ai','대화 2025. 7. 25. 오전 10:16','2025-07-25 01:16:52','2025-07-25 01:17:23');
/*!40000 ALTER TABLE `chat_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_history`
--

DROP TABLE IF EXISTS `document_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `session_id` int DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `analysis_type` varchar(50) DEFAULT NULL,
  `result_summary` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  CONSTRAINT `document_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `document_history_ibfk_2` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_history`
--

LOCK TABLES `document_history` WRITE;
/*!40000 ALTER TABLE `document_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `document_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `presentation_plans`
--

DROP TABLE IF EXISTS `presentation_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `presentation_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `session_id` int DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `business_content` text,
  `presentation_data` json DEFAULT NULL,
  `slides_count` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  CONSTRAINT `presentation_plans_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `presentation_plans_ibfk_2` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `presentation_plans`
--

LOCK TABLES `presentation_plans` WRITE;
/*!40000 ALTER TABLE `presentation_plans` DISABLE KEYS */;
/*!40000 ALTER TABLE `presentation_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'demo@teampulse.com','Demo User','2025-07-23 07:35:21','2025-07-23 07:35:21');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-25  8:07:05

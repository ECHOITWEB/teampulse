실시간 팀채팅
AI 어시스턴트와 함께하는 스마트한 협업 공간

**유저가 채팅창에 글을 쓰면 그 위의 대화 맥락을 고려하여 챗봇이 대답까지 해야함. gpt의 api키를 연결해놔야 해.**
[메뉴 구성]

*채널명*
# general
# dev-team
# marketing
# project-secret (잠금 표시되어 있어야 함)

*Direct Messages*
@Licky (안읽은 메시지 5개 표기)
@Mina  (안읽은 메시지 3개 표기)
@Hayden
@Hannah (2days ago 표기)
@이희성 (6days ago 표기)


[#general 채널 클릭시]

# general 24명
* 제목 아래쪽에 "Pulse AI 초대하기" 버튼 필요.

* 대화 구성
Mina : 안녕하세요! 오늘 스프린트 미팅 있는거 맞죠?
Hayden : 네 맞아요! 10시에 시작합니다 (좋아요 6개 찍혀있어야 함)
System : Hayden이 Pulse AI를 초대했습니다.
Pulse AI : # general 대화방에 초대되었습니다. (Model : Claude Sonnet 4)
Hayden : @AI 예정된 미팅 내역 알려줘
Pulse AI : 예정된 미팅 내역은 다음과 같습니다.
        8월 18일 오전 10시 전체 팀 스프린트 미팅
        8월 18일 오전 11시 개발 팀 미팅
        8월 18일 오후 2시 대표님 면담 (@Hannah @이희성)
        8월 19일 오전 10시 마케팅팀 외주 미팅
Licky : 이번 스프린트 목표 달성률이 85%네요. 잘하고 있습니다 (박수)
        (아래쪽에 sprint_report.pdf 파일 첨부됨. 클릭시 다운로드) (좋아요 3개, 힘내요 1개, 폭죽 20개)

# dev-team 11명
* 제목 아래쪽에 "Pulse AI 초대하기" 버튼 필요.

* 대화 구성
Licky : @Hayden 지금 개발 진척도 체크해주세요
System : Hayden이 Pulse AI를 초대했습니다.
Pulse AI : # dev-team 대화방에 초대되었습니다. (Model : GPT-5)
Hayden : @AI 개발 진척도와 코드 커밋 내역 알려줘
Pulse AI : 지난 주까지 진행된 진척도 그래프와 커밋 내역입니다.
           (코드 추가 사항과 수정사항이 커서 또는 클로드코드처럼 뜨며 (추가 몇줄, 삭제 몇줄, 수정 몇 줄, 총 코드 길이 등) 커밋 로그가 함께 뜸)
Linda : 이 코드가 반영이 안되어있어요. 추가해서 커밋해주세요
        (아래쪽에 AITools.tsx 파일 첨부됨. 코드 블럭이 뜨고 코드들을 쭉 스크롤하며 볼 수 있게끔) (좋아요 3개, 힘내요 1개, 폭죽 80개)
Pulse AI : AITools.tsx 코드가 정상적으로 반영되었습니다. 
           (브랜치 보기, 커밋하기 버튼 뜨기)

# marketing 8명
* 제목 아래쪽에 "Pulse AI 초대하기" 버튼 필요.
James : @Hannah 마케팅에 사용할 이미지들 확정되었나요?
Hannah : (이미지 3장 올림, 프리뷰로 보인다. 이미지 링크는 /Users/pablokim/teampulse/public/image/chatting )
Hannah : 이 중에서 선택해주시겠어요?
Jandi : 저는 1번이요
Hometax : 저는 3번이 좋습니다.
System : James가 Pulse AI를 초대했습니다.
Pulse AI : # dev-team 대화방에 초대되었습니다. (Model : GPT-4.1)
James : @AI 1,2,3 번 투표 만들어줘
Pulse AI : 투표창을 생성하겠습니다.
           (아래쪽에 1,2,3번 중 고를 수 있는 투표가 진행됨. 1번 5표, 2번 2표, 3번 2표)
Hannah : 1번으로 확정할게요. @AI 투표 종료해줘
Pulse AI : [투표 결과] 1번 


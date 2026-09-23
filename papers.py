# -*- coding: utf-8 -*-
"""Références bibliographiques exposées dans le Guide.

Source unique, consommée par build.py pour écrire la section « Pour aller plus
loin » de chaque page du Guide, en français et en anglais. L'Atlas garde sa
bibliographie complète dans <Outil>/SOURCES.html ; ce fichier n'en retient que
ce qu'un utilisateur a besoin de lire.

Chaque entrée : url, ref (auteur/revue/année), title (titre exact), fr, en.
« free » ajoute, quand il existe, un lien vers une version en accès libre.

Règle : aucune URL qui ne figure pas déjà dans la bibliographie de l'outil.
build.py le vérifie à chaque construction.
"""

# Le module a-t-il un papier qui le décrit ? Sinon « note » le dit franchement.
PAPERS = {

 "FlexReg": {
  "note": {
   "fr": "Aucune publication ne décrit FlexReg : ni la zone que vous dessinez à "
         "la main, ni le recalage qui s'ensuit. Les lectures ci-dessous éclairent "
         "la démarche, pas le module.",
   "en": "No publication describes FlexReg: neither the region you draw by hand "
         "nor the registration that follows. The readings below explain the "
         "approach, not the module.",
   "pt": "Nenhuma publicação descreve o FlexReg: nem a região que você desenha à mão, "
         "nem o registro que vem em seguida. As leituras abaixo explicam a abordagem, "
         "não o módulo.",
   "ko": "FlexReg를 설명하는 논문은 없습니다. 직접 그리는 영역도, 그 뒤에 이어지는 "
         "정합도 다루지 않습니다. 아래 자료는 모듈이 아니라 접근 방식을 설명합니다.",
   "th": "ไม่มีงานตีพิมพ์ใดอธิบาย FlexReg ทั้งบริเวณที่ผู้ใช้วาดเอง และการลงทะเบียนภาพที่ตามมา "
         "เอกสารด้านล่างอธิบายแนวทาง ไม่ใช่ตัวโมดูล"},
  "self": [],
  "around": [
   {"url": "https://doi.org/10.1007/978-3-031-46914-5_18",
    "ref": "Hutin et al., ShapeMI 2023",
    "title": "AReg IOS: Automatic Registration on IntraOralScans",
    "fr": "La moitié publiée de la famille : un réseau repère tout seul la zone "
          "stable du palais, là où FlexReg vous laisse la dessiner.",
    "en": "The published half of the family: a network finds the stable palatal "
          "region on its own, where FlexReg leaves you to draw it.",
    "pt": "A metade publicada da família: uma rede encontra sozinha a região estável do "
          "palato, enquanto no FlexReg é você quem a desenha.",
    "ko": "이 계열에서 논문으로 발표된 쪽입니다. 신경망이 구개의 안정된 영역을 스스로 "
          "찾으며, FlexReg에서는 이 영역을 사용자가 직접 그립니다.",
    "th": "ส่วนที่ได้รับการตีพิมพ์ของโมดูลกลุ่มนี้ เครือข่ายประสาทเทียมค้นหาบริเวณที่มั่นคงของเพดานปากได้เอง "
          "ขณะที่ FlexReg ให้ผู้ใช้วาดบริเวณนั้นเอง"},
   {"url": "https://doi.org/10.1038/s41598-017-06013-5",
    "ref": "Vasilakos et al., Scientific Reports 2017",
    "title": "Assessment of different techniques for 3D superimposition of serial "
             "digital maxillary dental casts on palatal structures",
    "fr": "Compare les zones du palais utilisables comme référence et ce que "
          "chacune vaut en reproductibilité — utile pour décider où dessiner.",
    "en": "Compares the palatal regions usable as a reference and how "
          "reproducible each one is — useful when deciding where to draw.",
    "pt": "Compara as regiões do palato utilizáveis como referência e a "
          "reprodutibilidade de cada uma — útil para decidir onde desenhar.",
    "ko": "기준으로 쓸 수 있는 구개 영역들과 각 영역의 재현성을 비교합니다. 어디를 "
          "그릴지 정할 때 유용합니다.",
    "th": "เปรียบเทียบบริเวณเพดานปากที่ใช้เป็นจุดอ้างอิงได้ และความสามารถในการทำซ้ำของแต่ละบริเวณ — "
          "มีประโยชน์เมื่อต้องตัดสินใจว่าจะวาดตรงไหน"},
   {"url": "https://doi.org/10.1111/ocr.12309",
    "ref": "Garib et al., Orthod Craniofac Res 2019",
    "title": "Superimposition of maxillary digital models using the palatal "
             "rugae: does ageing affect the reliability?",
    "fr": "Les rugae palatines comme repère, et l'effet de la croissance sur "
          "leur stabilité — à lire avant de recaler des patients en croissance.",
    "en": "Palatal rugae as a landmark, and how growth affects their stability — "
          "worth reading before registering growing patients.",
    "pt": "As rugosidades palatinas como landmark e o efeito do crescimento sobre a "
          "estabilidade delas — vale a leitura antes de fazer o registro de pacientes "
          "em crescimento.",
    "ko": "랜드마크로서의 구개주름과 성장이 그 안정성에 미치는 영향을 다룹니다. 성장기 "
          "환자를 정합하기 전에 읽어 볼 만합니다.",
    "th": "รอยย่นเพดานปากในฐานะ landmark และผลของการเจริญเติบโตต่อความมั่นคงของรอยย่น — "
          "ควรอ่านก่อนทำการลงทะเบียนภาพในผู้ป่วยที่ยังเจริญเติบโต"},
  ]},

 "ALI": {
  "self": [
   {"url": "https://doi.org/10.1111/ocr.12642",
    "ref": "Gillot et al., Orthod Craniofac Res 2023",
    "title": "Automatic landmark identification in cone-beam computed tomography",
    "fr": "Le papier de la voie CBCT : des agents qui se déplacent dans le volume "
          "jusqu'au point cherché. Donne les écarts mesurés, landmark par landmark.",
    "en": "The paper behind the CBCT path: agents that walk through the volume to "
          "the landmark. Reports the measured error, landmark by landmark.",
    "pt": "O artigo por trás do fluxo CBCT: agentes que percorrem o volume até o "
          "landmark. Relata o erro medido, landmark por landmark.",
    "ko": "CBCT 경로의 기반 논문입니다. 에이전트가 볼륨 안을 이동해 랜드마크에 "
          "도달합니다. 측정 오차를 랜드마크별로 보고합니다.",
    "th": "บทความเบื้องหลังเส้นทาง CBCT: เอเจนต์ที่เคลื่อนที่ภายในภาพปริมาตรไปยัง landmark "
          "รายงานค่าความคลาดเคลื่อนที่วัดได้ทีละ landmark"},
   {"url": "https://doi.org/10.1007/978-3-031-23179-7_4",
    "ref": "Baquero et al., CLIP 2022 (LNCS 13746)",
    "title": "Automatic Landmark Identification on IntraOralScans",
    "fr": "Le papier de la voie maillage : la surface est photographiée sous "
          "plusieurs angles, et chaque pixel vote pour un landmark.",
    "en": "The paper behind the mesh path: the surface is photographed from "
          "several viewpoints, and each pixel votes for a landmark.",
    "pt": "O artigo por trás do fluxo de malha: a superfície é fotografada de vários "
          "pontos de vista, e cada pixel vota em um landmark.",
    "ko": "메시 경로의 기반 논문입니다. 표면을 여러 시점에서 촬영하고, 각 픽셀이 "
          "랜드마크에 투표합니다.",
    "th": "บทความเบื้องหลังเส้นทางเมช: พื้นผิวถูกถ่ายภาพจากหลายมุมมอง และแต่ละพิกเซลโหวตให้ landmark"},
  ],
  "around": [
   {"url": "https://doi.org/10.1016/j.media.2019.02.007",
    "ref": "Alansary et al., Medical Image Analysis 2019",
    "title": "Evaluating reinforcement learning agents for anatomical landmark "
             "detection",
    "fr": "D'où vient l'idée de l'agent qui marche vers le point, et ce qu'elle "
          "coûte face à une régression directe des coordonnées.",
    "en": "Where the walking-agent idea comes from, and what it costs compared "
          "with regressing the coordinates directly.",
    "pt": "De onde vem a ideia do agente que caminha até o ponto, e quanto ela custa em "
          "comparação com a regressão direta das coordenadas.",
    "ko": "이동하는 에이전트라는 아이디어의 출처와, 좌표를 직접 회귀하는 방식에 비해 "
          "치르는 비용을 다룹니다.",
    "th": "ที่มาของแนวคิดเอเจนต์ที่เดินไปยังจุดเป้าหมาย "
          "และต้นทุนของแนวคิดนี้เมื่อเทียบกับการถดถอยพิกัดโดยตรง"},
   {"url": "https://doi.org/10.1117/12.2582205",
    "ref": "Boubolo et al., SPIE Medical Imaging 2021",
    "title": "FlyBy CNN: a 3D surface segmentation framework",
    "fr": "Le rendu multi-vues sur lequel repose la voie maillage.",
    "en": "The multi-view rendering the mesh path is built on.",
    "pt": "A renderização multivista em que se baseia o fluxo de malha.",
    "ko": "메시 경로가 기반으로 하는 다중 시점 렌더링입니다.",
    "th": "การเรนเดอร์หลายมุมมองที่เส้นทางเมชใช้เป็นพื้นฐาน"},
  ]},

 "AMASSS": {
  "note": {
   "fr": "Le papier ci-dessous décrit la version UNETR du module. Ce qui "
         "s'exécute aujourd'hui est une bascule vers nnU-Net que personne n'a "
         "publiée : le citer pour décrire AMASSS tel qu'il tourne, c'est décrire "
         "une architecture qui n'est plus là.",
   "en": "The paper below describes the UNETR version of the module. What runs "
         "today is a switch to nnU-Net that nobody has published: citing it to "
         "describe AMASSS as it runs means describing an architecture that is "
         "no longer there.",
   "pt": "O artigo abaixo descreve a versão UNETR do módulo. O que roda hoje é uma "
         "migração para nnU-Net que ninguém publicou: citá-lo para descrever o AMASSS "
         "como ele roda é descrever uma arquitetura que não existe mais.",
   "ko": "아래 논문은 이 모듈의 UNETR 버전을 설명합니다. 현재 실행되는 것은 nnU-Net으로 "
         "전환한 버전이며, 이 전환은 어디에도 발표되지 않았습니다. 이 논문을 인용해 "
         "현재의 AMASSS를 설명하면 더 이상 존재하지 않는 구조를 설명하는 셈입니다.",
   "th": "บทความด้านล่างอธิบายโมดูลรุ่น UNETR สิ่งที่ทำงานอยู่ในปัจจุบันคือการเปลี่ยนไปใช้ nnU-Net "
         "ซึ่งไม่มีใครตีพิมพ์ การอ้างอิงบทความนี้เพื่ออธิบาย AMASSS "
         "ที่ทำงานอยู่จึงเท่ากับอธิบายสถาปัตยกรรมที่ไม่มีอยู่แล้ว"},
  "self": [
   {"url": "https://doi.org/10.1371/journal.pone.0275033",
    "ref": "Gillot et al., PLOS ONE 2022",
    "title": "Automatic multi-anatomical skull structure segmentation of "
             "cone-beam computed tomography scans using 3D UNETR",
    "fr": "Les structures segmentées, les données d'entraînement et la précision "
          "mesurée. En accès libre.",
    "en": "The structures segmented, the training data and the measured "
          "accuracy. Open access.",
    "pt": "As estruturas segmentadas, os dados de treinamento e a acurácia medida. "
          "Acesso aberto.",
    "ko": "분할하는 구조물, 학습 데이터, 측정된 정확도를 다룹니다. 오픈 액세스입니다.",
    "th": "โครงสร้างที่แบ่งส่วน ข้อมูลที่ใช้ฝึก และความแม่นยำที่วัดได้ เข้าถึงได้โดยเสรี"},
  ],
  "around": [
   {"url": "https://doi.org/10.1038/s41592-020-01008-z",
    "ref": "Isensee et al., Nature Methods 2021",
    "title": "nnU-Net: a self-configuring method for deep learning-based "
             "biomedical image segmentation",
    "fr": "Le socle de la version actuelle : une méthode qui choisit seule son "
          "architecture et ses réglages d'après le jeu de données.",
    "en": "The foundation of the current version: a method that picks its own "
          "architecture and settings from the dataset.",
    "pt": "A base da versão atual: um método que escolhe sozinho a arquitetura e as "
          "configurações a partir do conjunto de dados.",
    "ko": "현재 버전의 토대입니다. 데이터셋을 보고 구조와 설정을 스스로 고르는 "
          "방법입니다.",
    "th": "รากฐานของรุ่นปัจจุบัน: วิธีที่เลือกสถาปัตยกรรมและการตั้งค่าของตัวเองจากชุดข้อมูล"},
   {"url": "https://doi.org/10.1109/WACV51458.2022.00181",
    "ref": "Hatamizadeh et al., WACV 2022",
    "title": "UNETR: Transformers for 3D Medical Image Segmentation",
    "fr": "L'architecture du papier PLOS ONE, donc de la version historique du "
          "module.",
    "en": "The architecture of the PLOS ONE paper, i.e. of the module's historic "
          "version.",
    "pt": "A arquitetura do artigo da PLOS ONE, ou seja, da versão histórica do módulo.",
    "ko": "PLOS ONE 논문의 구조, 즉 이 모듈의 초기 버전 구조입니다.",
    "th": "สถาปัตยกรรมในบทความ PLOS ONE ซึ่งก็คือของโมดูลรุ่นดั้งเดิม"},
  ]},

 "ASO": {
  "self": [
   {"url": "https://doi.org/10.1007/978-3-031-45249-9_5",
    "free": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11104011/",
    "ref": "Anchling et al., LNCS 14242, 2023",
    "title": "Automated Orientation and Registration of Cone-Beam Computed "
             "Tomography Scans",
    "fr": "Le papier de la famille ASO/AREG : comment l'orientation automatique "
          "est obtenue, et de combien elle s'écarte d'une orientation manuelle.",
    "en": "The ASO/AREG family paper: how the automatic orientation is obtained, "
          "and how far it departs from a manual one.",
    "pt": "O artigo da família ASO/AREG: como a orientação automática é obtida e quanto "
          "ela se afasta de uma orientação manual.",
    "ko": "ASO/AREG 계열의 논문입니다. 자동 방향 설정을 어떻게 얻는지, 수동 방향 설정과 "
          "얼마나 차이가 나는지 다룹니다.",
    "th": "บทความของกลุ่มโมดูล ASO/AREG: วิธีได้มาซึ่งการจัดแนวอัตโนมัติ และความต่างจากการจัดแนวด้วยมือ"},
  ],
  "around": [
   {"url": "https://doi.org/10.1016/j.ajodo.2015.10.021",
    "ref": "Ruellas et al., AJODO 2016",
    "title": "Common 3-dimensional coordinate system for assessment of "
             "directional changes",
    "fr": "Le système de coordonnées que l'orientation automatique cherche à "
          "reproduire. C'est lui qui définit ce que « bien orienté » veut dire.",
    "en": "The coordinate system the automatic orientation aims to reproduce. "
          "It is what defines “correctly oriented”.",
    "pt": "O sistema de coordenadas que a orientação automática procura reproduzir. É "
          "ele que define o que é “bem orientado”.",
    "ko": "자동 방향 설정이 재현하려는 좌표계입니다. “올바른 방향”이 무엇인지를 이 "
          "좌표계가 정의합니다.",
    "th": "ระบบพิกัดที่การจัดแนวอัตโนมัติพยายามทำซ้ำ ระบบนี้เป็นตัวกำหนดว่า “จัดแนวถูกต้อง” หมายถึงอะไร"},
   {"url": "https://doi.org/10.1111/ocr.12642",
    "ref": "Gillot et al., Orthod Craniofac Res 2023",
    "title": "Automatic landmark identification in cone-beam computed tomography",
    "fr": "Les landmarks sur lesquels ASO s'appuie pour s'orienter viennent de là.",
    "en": "The landmarks ASO orients itself on come from here.",
    "pt": "Os landmarks nos quais o ASO se baseia para a orientação vêm daqui.",
    "ko": "ASO가 방향을 잡을 때 쓰는 랜드마크가 여기서 나옵니다.",
    "th": "landmark ที่ ASO ใช้ในการจัดแนวมาจากที่นี่"},
  ]},

 "AREG_IOS": {
  "self": [
   {"url": "https://doi.org/10.1007/978-3-031-46914-5_18",
    "ref": "Hutin et al., ShapeMI 2023 (LNCS 14350)",
    "title": "AReg IOS: Automatic Registration on IntraOralScans",
    "fr": "Le papier du module : un réseau isole la zone stable du palais, puis "
          "un ICP recale les deux scans dessus.",
    "en": "The module's paper: a network isolates the stable palatal region, then "
          "an ICP registers the two scans on it.",
    "pt": "O artigo do módulo: uma rede isola a região estável do palato e, em seguida, "
          "um ICP faz o registro dos dois escaneamentos sobre ela.",
    "ko": "이 모듈의 논문입니다. 신경망이 구개의 안정된 영역을 분리하고, ICP가 그 "
          "영역을 기준으로 두 스캔을 정합합니다.",
    "th": "บทความของโมดูล: เครือข่ายประสาทเทียมแยกบริเวณที่มั่นคงของเพดานปาก จากนั้น ICP "
          "ทำการลงทะเบียนภาพสแกนทั้งสองบนบริเวณนั้น"},
  ],
  "around": [
   {"url": "https://doi.org/10.1038/s41598-017-06013-5",
    "ref": "Vasilakos et al., Scientific Reports 2017",
    "title": "Assessment of different techniques for 3D superimposition of serial "
             "digital maxillary dental casts on palatal structures",
    "fr": "Ce que valent les différentes zones du palais comme référence de "
          "superposition.",
    "en": "How the various palatal regions compare as superimposition references.",
    "pt": "Como as diferentes regiões do palato se comparam como referência de "
          "sobreposição.",
    "ko": "여러 구개 영역을 중첩 기준으로 비교합니다.",
    "th": "การเปรียบเทียบบริเวณต่าง ๆ ของเพดานปากในฐานะจุดอ้างอิงสำหรับการซ้อนภาพ"},
   {"url": "https://doi.org/10.1111/ocr.12535",
    "ref": "Aliaga-Del Castillo et al., Orthod Craniofac Res 2022",
    "title": "Comparison and reproducibility of three methods for maxillary "
             "digital dental model registration in open bite patients",
    "fr": "Trois méthodes de recalage comparées sur des patients en béance — le "
          "cas où le choix de la zone compte le plus.",
    "en": "Three registration methods compared on open-bite patients — the case "
          "where the choice of region matters most.",
    "pt": "Três métodos de registro comparados em pacientes com mordida aberta — o caso "
          "em que a escolha da região mais pesa.",
    "ko": "개방교합 환자에서 세 가지 정합 방법을 비교합니다. 영역 선택이 가장 중요한 "
          "경우입니다.",
    "th": "เปรียบเทียบวิธีการลงทะเบียนภาพสามวิธีในผู้ป่วยสบฟันเปิด — กรณีที่การเลือกบริเวณมีผลมากที่สุด"},
   {"url": "https://projectweek.na-mic.org/PW36_2022_Virtual/Projects/ALIDDM/",
    "ref": "NA-MIC Project Week 36, 2022",
    "title": "ALIIOS — Automatic Landmarks Identification for Intra Oral Scans",
    "fr": "ALI_IOS, le réseau qui fournit les landmarks mucogingivaux, n'a aucune "
          "publication : cette page de projet en est la seule description publique.",
    "en": "ALI_IOS, the network that supplies the mucogingival landmarks, has no "
          "publication: this project page is its only public description.",
    "pt": "O ALI_IOS, a rede que fornece os landmarks mucogengivais, não tem "
          "publicação: esta página de projeto é sua única descrição pública.",
    "ko": "점막치은 랜드마크를 제공하는 신경망인 ALI_IOS는 논문이 없습니다. 이 프로젝트 "
          "페이지가 유일한 공개 설명입니다.",
    "th": "ALI_IOS ซึ่งเป็นเครือข่ายที่ให้ landmark บริเวณรอยต่อเหงือกกับเยื่อเมือก ไม่มีงานตีพิมพ์ "
          "หน้าโครงการนี้เป็นคำอธิบายสาธารณะเพียงแหล่งเดียว"},
  ]},

 "AREG_CBCT": {
  "self": [
   {"url": "https://doi.org/10.1007/978-3-031-45249-9_5",
    "free": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11104011/",
    "ref": "Anchling et al., LNCS 14242, 2023",
    "title": "Automated Orientation and Registration of Cone-Beam Computed "
             "Tomography Scans",
    "fr": "Le papier du module : orientation puis recalage voxel-à-voxel sur une "
          "région de référence, et l'erreur mesurée sur une série de patients.",
    "en": "The module's paper: orientation then voxel-based registration on a "
          "region of reference, with the error measured on a patient series.",
    "pt": "O artigo do módulo: orientação seguida de registro baseado em voxels sobre "
          "uma região de referência, com o erro medido em uma série de pacientes.",
    "ko": "이 모듈의 논문입니다. 방향 설정 후 기준 영역에서 복셀 기반 정합을 수행하며, "
          "환자군에서 측정한 오차를 제시합니다.",
    "th": "บทความของโมดูล: การจัดแนว ตามด้วยการลงทะเบียนภาพแบบอิงวอกเซลบนบริเวณอ้างอิง "
          "พร้อมค่าความคลาดเคลื่อนที่วัดในกลุ่มผู้ป่วย"},
  ],
  "around": [
   {"url": "https://doi.org/10.1371/journal.pone.0157625",
    "ref": "Ruellas et al., PLOS ONE 2016",
    "title": "3D Mandibular Superimposition: Comparison of Regions of Reference "
             "for Voxel-Based Registration",
    "fr": "Quelle région de la mandibule prendre comme référence, et pourquoi le "
          "choix change le résultat. C'est la décision que vous prenez dans "
          "l'interface.",
    "en": "Which mandibular region to take as a reference, and why the choice "
          "changes the result. This is the decision you make in the interface.",
    "pt": "Qual região da mandíbula usar como referência e por que essa escolha muda o "
          "resultado. É a decisão que você toma na interface.",
    "ko": "하악의 어느 영역을 기준으로 삼을지, 그리고 그 선택이 왜 결과를 바꾸는지 "
          "다룹니다. 인터페이스에서 사용자가 내리는 바로 그 결정입니다.",
    "th": "ควรใช้บริเวณใดของขากรรไกรล่างเป็นจุดอ้างอิง และเหตุใดการเลือกนั้นจึงเปลี่ยนผลลัพธ์ "
          "นี่คือการตัดสินใจที่คุณทำในหน้าจอโปรแกรม"},
   {"url": "https://doi.org/10.1016/j.ajodo.2015.09.026",
    "ref": "Ruellas et al., AJODO 2016",
    "title": "Comparison and reproducibility of 2 regions of reference for "
             "maxillary regional registration with cone-beam computed tomography",
    "fr": "La même question côté maxillaire.",
    "en": "The same question on the maxillary side.",
    "pt": "A mesma questão, do lado da maxila.",
    "ko": "같은 질문을 상악에 대해 다룹니다.",
    "th": "คำถามเดียวกันในฝั่งขากรรไกรบน"},
   {"url": "https://doi.org/10.1259/dmfr/17102411",
    "ref": "Cevidanes et al., Dentomaxillofac Radiol 2005",
    "title": "Superimposition of 3D cone-beam CT models of orthognathic surgery "
             "patients",
    "fr": "La référence historique du laboratoire : la superposition sur la base "
          "du crâne, faite à la main, qu'AREG_CBCT automatise.",
    "en": "The lab's founding reference: the cranial-base superimposition, done "
          "by hand, that AREG_CBCT automates.",
    "pt": "A referência fundadora do laboratório: a sobreposição na base do crânio, "
          "feita à mão, que o AREG_CBCT automatiza.",
    "ko": "연구실의 출발점이 된 문헌입니다. AREG_CBCT가 자동화하는, 수작업으로 하던 "
          "두개저 중첩을 다룹니다.",
    "th": "เอกสารอ้างอิงตั้งต้นของห้องปฏิบัติการ: การซ้อนภาพบนฐานกะโหลกศีรษะที่ทำด้วยมือ ซึ่ง AREG_CBCT "
          "ทำให้เป็นอัตโนมัติ"},
  ]},

 "AREG_IOSCBCT": {
  "note": {
   "fr": "Aucune publication ne décrit la voie multimodale de ce module. Le "
         "papier AReg IOS porte sur le recalage d'un scan intra-oral sur un autre "
         "dans le temps, pas sur l'appariement d'un maillage avec un CBCT.",
   "en": "No publication describes this module's multimodal path. The AReg IOS "
         "paper covers registering one intra-oral scan onto another over time, "
         "not matching a mesh with a CBCT.",
   "pt": "Nenhuma publicação descreve o fluxo multimodal deste módulo. O artigo AReg "
         "IOS trata do registro de um escaneamento intraoral sobre outro ao longo do "
         "tempo, não do pareamento de uma malha com um CBCT.",
   "ko": "이 모듈의 다중 모달 경로를 설명하는 논문은 없습니다. AReg IOS 논문은 시간 "
         "간격을 둔 두 구강 스캔의 정합을 다루며, 메시와 CBCT의 정합은 다루지 않습니다.",
   "th": "ไม่มีงานตีพิมพ์ใดอธิบายเส้นทางหลายรูปแบบภาพ (multimodal) ของโมดูลนี้ บทความ AReg IOS "
         "กล่าวถึงการลงทะเบียนภาพสแกนในช่องปากภาพหนึ่งเข้ากับอีกภาพหนึ่งตามช่วงเวลา ไม่ใช่การจับคู่เมชกับ "
         "CBCT"},
  "self": [],
  "around": [
   {"url": "https://doi.org/10.1007/s00784-025-06183-x",
    "ref": "Zheng et al., Clinical Oral Investigations 2025",
    "title": "Automatic multimodal registration of cone-beam computed tomography "
             "and intraoral scans: a systematic review and meta-analysis",
    "fr": "L'état de l'art du problème que ce module attaque, avec les erreurs "
          "rapportées par les méthodes publiées. Le meilleur point d'entrée.",
    "en": "The state of the art on the problem this module tackles, with the "
          "errors reported by published methods. The best entry point.",
    "pt": "O estado da arte do problema que este módulo aborda, com os erros relatados "
          "pelos métodos publicados. O melhor ponto de partida.",
    "ko": "이 모듈이 다루는 문제의 최신 연구 동향과, 발표된 방법들이 보고한 오차를 "
          "정리합니다. 가장 좋은 입문 자료입니다.",
    "th": "สถานะความรู้ล่าสุดของปัญหาที่โมดูลนี้แก้ พร้อมค่าความคลาดเคลื่อนที่วิธีที่ตีพิมพ์แล้วรายงานไว้ "
          "เป็นจุดเริ่มต้นที่ดีที่สุด"},
   {"url": "https://doi.org/10.3390/bioengineering10111326",
    "ref": "Kim et al., Bioengineering 2023",
    "title": "Novel Procedure for Automatic Registration between Cone-Beam "
             "Computed Tomography and Intraoral Scan Data Supported with 3D "
             "Segmentation",
    "fr": "Une approche voisine, en accès libre : segmentation des dents puis "
          "appariement. Utile pour comparer à ce que fait le module.",
    "en": "A neighbouring approach, open access: segment the teeth, then match. "
          "Useful to compare with what the module does.",
    "pt": "Uma abordagem próxima, em acesso aberto: segmentar os dentes e depois fazer "
          "o pareamento. Útil para comparar com o que o módulo faz.",
    "ko": "오픈 액세스로 공개된 유사한 접근법입니다. 치아를 분할한 뒤 정합합니다. 이 "
          "모듈의 방식과 비교할 때 유용합니다.",
    "th": "แนวทางใกล้เคียงที่เข้าถึงได้โดยเสรี: แบ่งส่วนฟันก่อน แล้วจึงจับคู่ "
          "มีประโยชน์สำหรับเปรียบเทียบกับสิ่งที่โมดูลทำ"},
   {"url": "https://doi.org/10.1016/j.media.2024.103096",
    "ref": "Jang et al., Medical Image Analysis 2024",
    "title": "Fully automatic integration of dental CBCT images and full-arch "
             "intraoral impressions with stitching error correction via "
             "individual tooth segmentation and identification",
    "fr": "Va plus loin : corrige aussi l'erreur de raboutage du scan intra-oral, "
          "qui est le défaut que vous verrez le plus souvent sur arcade complète.",
    "en": "Goes further: also corrects the intra-oral scan's stitching error, the "
          "defect you will most often see on a full arch.",
    "pt": "Vai além: também corrige o erro de junção (stitching) do escaneamento "
          "intraoral, o defeito que você verá com mais frequência em arcada completa.",
    "ko": "한 걸음 더 나아가 구강 스캔의 스티칭 오차도 보정합니다. 전악 스캔에서 가장 "
          "자주 보게 될 결함입니다.",
    "th": "ก้าวไปอีกขั้น: แก้ไขความคลาดเคลื่อนจากการต่อภาพ (stitching) ของภาพสแกนในช่องปากด้วย "
          "ซึ่งเป็นข้อบกพร่องที่คุณจะพบบ่อยที่สุดในการสแกนเต็มขากรรไกร"},
  ]},

 "GreedyReg": {
  "self": [
   {"url": "https://arxiv.org/abs/1904.11929",
    "ref": "Venet et al., arXiv 2019",
    "title": "Accurate and Robust Alignment of Variable-Stained Histologic Images "
             "Using a General-Purpose Greedy Diffeomorphic Registration Tool",
    "fr": "Le papier de <code>greedy</code>, le moteur que ce module se contente "
          "de piloter. Court, et c'est la citation que demandent ses auteurs.",
    "en": "The paper for <code>greedy</code>, the engine this module merely "
          "drives. Short, and it is the citation its authors ask for.",
    "pt": "O artigo do <code>greedy</code>, o motor que este módulo apenas controla. É "
          "curto, e é a citação que os autores pedem.",
    "ko": "이 모듈이 단순히 구동만 하는 엔진인 <code>greedy</code>의 논문입니다. 분량이 "
          "짧으며, 저자들이 인용을 요청하는 논문입니다.",
    "th": "บทความของ <code>greedy</code> เครื่องมือหลักที่โมดูลนี้เพียงแค่สั่งงาน บทความสั้น "
          "และเป็นการอ้างอิงที่ผู้พัฒนาขอให้ใช้"},
  ],
  "around": [
   {"url": "https://doi.org/10.1016/j.neuroimage.2006.01.015",
    "ref": "Yushkevich et al., NeuroImage 2006",
    "title": "User-guided 3D active contour segmentation of anatomical "
             "structures: Significantly improved efficiency and reliability",
    "fr": "La référence d'ITK-SNAP, dont <code>greedy</code> est issu et dont le "
          "module reprend une partie du vocabulaire.",
    "en": "The ITK-SNAP reference, which <code>greedy</code> came out of and "
          "whose vocabulary the module borrows.",
    "pt": "A referência do ITK-SNAP, do qual o <code>greedy</code> se originou e de "
          "cujo vocabulário o módulo se vale.",
    "ko": "<code>greedy</code>가 파생된 ITK-SNAP의 참고문헌입니다. 이 모듈은 ITK-SNAP의 "
          "용어 일부를 가져다 씁니다.",
    "th": "เอกสารอ้างอิงของ ITK-SNAP ซึ่ง <code>greedy</code> พัฒนาต่อมาจาก "
          "และโมดูลนี้ยืมคำศัพท์บางส่วนมาใช้"},
   {"url": "https://greedy.readthedocs.io/en/latest/reference.html",
    "ref": "Documentation de greedy",
    "title": "greedy — command reference",
    "fr": "La liste complète des options du moteur, si vous voulez savoir ce que "
          "recouvre un réglage de l'interface.",
    "en": "The engine's full option list, if you want to know what a setting in "
          "the interface stands for.",
    "pt": "A lista completa de opções do motor, caso você queira saber a que "
          "corresponde um ajuste da interface.",
    "ko": "엔진의 전체 옵션 목록입니다. 인터페이스의 설정 하나가 무엇을 뜻하는지 알고 "
          "싶을 때 참고합니다.",
    "th": "รายการตัวเลือกทั้งหมดของเครื่องมือ หากคุณต้องการทราบว่าการตั้งค่าในหน้าจอโปรแกรมหมายถึงอะไร"},
  ]},

 "MRI2CBCT": {
  "self": [
   {"url": "https://doi.org/10.1007/978-3-031-73083-2_7",
    "ref": "Leroux et al., CLIP 2024 (LNCS 15196)",
    "title": "Novel CBCT-MRI Registration Approach for Enhanced Analysis of "
             "Temporomandibular Degenerative Joint Disease",
    "fr": "Le papier du module : la démarche de recalage IRM ↔ CBCT sur "
          "l'articulation temporo-mandibulaire.",
    "en": "The module's paper: the MRI ↔ CBCT registration approach on the "
          "temporomandibular joint.",
    "pt": "O artigo do módulo: a abordagem de registro MRI ↔ CBCT na articulação "
          "temporomandibular (ATM).",
    "ko": "이 모듈의 논문입니다. 측두하악관절(TMJ)에서의 MRI ↔ CBCT 정합 방법을 "
          "다룹니다.",
    "th": "บทความของโมดูล: แนวทางการลงทะเบียนภาพ MRI ↔ CBCT ที่ข้อต่อขากรรไกร (TMJ)"},
   {"url": "https://doi.org/10.1007/978-3-032-05479-1_5",
    "ref": "Gaydamour et al., CLIP 2025 (LNCS 16126)",
    "title": "AI-Driven Multimodal TMJ Patient Modeling: From Unstructured Notes "
             "to Precision Treatment",
    "fr": "La suite : ce recalage replacé dans la chaîne complète d'analyse du "
          "patient.",
    "en": "The follow-up: this registration put back into the full patient "
          "analysis pipeline.",
    "pt": "A continuação: esse registro inserido no fluxo completo de análise do "
          "paciente.",
    "ko": "후속 연구입니다. 이 정합을 환자 분석 파이프라인 전체 안에 다시 배치합니다.",
    "th": "งานต่อยอด: นำการลงทะเบียนภาพนี้ไปวางในกระบวนการวิเคราะห์ผู้ป่วยทั้งหมด"},
  ],
  "around": [
   {"url": "https://doi.org/10.1186/s40463-016-0144-4",
    "ref": "Al-Saleh et al., J Otolaryngol Head Neck Surg 2016",
    "title": "MRI and CBCT image registration of temporomandibular joint: a "
             "systematic review",
    "fr": "Pourquoi ce recalage est difficile, et ce que les méthodes publiées "
          "obtiennent. En accès libre.",
    "en": "Why this registration is hard, and what published methods achieve. "
          "Open access.",
    "pt": "Por que esse registro é difícil e o que os métodos publicados alcançam. "
          "Acesso aberto.",
    "ko": "이 정합이 왜 어려운지, 발표된 방법들이 어느 정도의 결과를 내는지 다룹니다. "
          "오픈 액세스입니다.",
    "th": "เหตุใดการลงทะเบียนภาพนี้จึงยาก และวิธีที่ตีพิมพ์แล้วทำได้ดีเพียงใด เข้าถึงได้โดยเสรี"},
   {"url": "https://doi.org/10.1371/journal.pone.0169555",
    "ref": "Al-Saleh et al., PLOS ONE 2017",
    "title": "Three-Dimensional Assessment of Temporomandibular Joint Using "
             "MRI-CBCT Image Registration",
    "fr": "Ce qu'on gagne cliniquement à superposer les deux modalités plutôt "
          "qu'à les lire côte à côte.",
    "en": "What you clinically gain from superimposing the two modalities rather "
          "than reading them side by side.",
    "pt": "O que você ganha clinicamente ao sobrepor as duas modalidades, em vez de "
          "lê-las lado a lado.",
    "ko": "두 영상을 나란히 판독하는 대신 중첩했을 때 임상적으로 얻는 이점을 다룹니다.",
    "th": "ประโยชน์ทางคลินิกของการซ้อนภาพทั้งสองรูปแบบ แทนการอ่านภาพเทียบกันข้าง ๆ"},
   {"url": "https://doi.org/10.1109/TMI.2009.2035616",
    "ref": "Klein et al., IEEE TMI 2010",
    "title": "elastix: A Toolbox for Intensity-Based Medical Image Registration",
    "fr": "Le moteur de recalage employé sous le capot.",
    "en": "The registration engine used under the hood.",
    "pt": "O motor de registro usado internamente.",
    "ko": "내부에서 사용하는 정합 엔진입니다.",
    "th": "เครื่องมือลงทะเบียนภาพที่ใช้อยู่เบื้องหลัง"},
  ]},

 "BatchDentalSeg": {
  "note": {
   "fr": "Le modèle d'origine est publié et documenté. Les trois variantes "
         "ajoutées ensuite — pédiatrique, <em>universal labelling</em>, "
         "naso-maxillaire — ne le sont pas : ni jeu d'entraînement, ni évaluation.",
   "en": "The original model is published and documented. The three variants "
         "added later — pediatric, <em>universal labelling</em>, naso-maxillary — "
         "are not: no training set, no evaluation.",
   "pt": "O modelo original é publicado e documentado. As três variantes adicionadas "
         "depois — pediátrica, <em>universal labelling</em>, nasomaxilar — não são: não "
         "há conjunto de treinamento nem avaliação.",
   "ko": "원래 모델은 논문으로 발표되어 문서화되어 있습니다. 나중에 추가된 세 가지 "
         "변형(소아용, <em>universal labelling</em>, 비상악)은 그렇지 않습니다. 학습 "
         "데이터셋도, 평가도 없습니다.",
   "th": "แบบจำลองดั้งเดิมได้รับการตีพิมพ์และมีเอกสารประกอบ ส่วนสามรุ่นที่เพิ่มเข้ามาภายหลัง — สำหรับเด็ก, "
         "<em>universal labelling</em>, จมูกและขากรรไกรบน — ไม่มี: ไม่มีชุดข้อมูลฝึก "
         "และไม่มีการประเมินผล"},
  "self": [
   {"url": "https://doi.org/10.1016/j.jdent.2024.105130",
    "ref": "Dot et al., Journal of Dentistry 2024",
    "title": "DentalSegmentator: Robust open source deep learning-based CT and "
             "CBCT image segmentation",
    "fr": "Le modèle que ce module exécute : les cinq structures segmentées, les "
          "données d'entraînement, et la précision mesurée. Libre à la lecture.",
    "en": "The model this module runs: the five structures segmented, the "
          "training data, and the measured accuracy. Free to read.",
    "pt": "O modelo que este módulo executa: as cinco estruturas segmentadas, os dados "
          "de treinamento e a acurácia medida. Leitura gratuita.",
    "ko": "이 모듈이 실행하는 모델입니다. 분할하는 다섯 구조물, 학습 데이터, 측정된 "
          "정확도를 다룹니다. 무료로 읽을 수 있습니다.",
    "th": "แบบจำลองที่โมดูลนี้ใช้งาน: โครงสร้างห้าส่วนที่แบ่งส่วน ข้อมูลที่ใช้ฝึก และความแม่นยำที่วัดได้ "
          "อ่านได้ฟรี"},
  ],
  "around": [
   {"url": "https://doi.org/10.1038/s41592-020-01008-z",
    "ref": "Isensee et al., Nature Methods 2021",
    "title": "nnU-Net: a self-configuring method for deep learning-based "
             "biomedical image segmentation",
    "fr": "Le cadre sur lequel tous les modèles du module reposent.",
    "en": "The framework every model in the module rests on.",
    "pt": "O framework em que se apoiam todos os modelos do módulo.",
    "ko": "이 모듈의 모든 모델이 기반으로 하는 프레임워크입니다.",
    "th": "เฟรมเวิร์กที่แบบจำลองทุกตัวในโมดูลนี้ใช้เป็นพื้นฐาน"},
   {"url": "https://doi.org/10.1111/ocr.12890",
    "ref": "Sinard et al., Orthod Craniofac Res 2025",
    "title": "Automated Cone Beam Computed Tomography Segmentation of Multiple "
             "Impacted Teeth With or Without Association to Rare Diseases: "
             "Evaluation of Four Deep Learning-Based Methods",
    "fr": "Une évaluation indépendante sur des cas difficiles — dents incluses "
          "multiples — qui situe ce que le modèle tient et où il lâche.",
    "en": "An independent evaluation on hard cases — multiple impacted teeth — "
          "showing where the model holds and where it gives way.",
    "pt": "Uma avaliação independente em casos difíceis — múltiplos dentes impactados — "
          "que mostra onde o modelo se sustenta e onde falha.",
    "ko": "어려운 증례(다수의 매복치)에 대한 독립적인 평가입니다. 모델이 어디서 버티고 "
          "어디서 무너지는지 보여 줍니다.",
    "th": "การประเมินอิสระในกรณียาก — ฟันคุดหลายซี่ — ที่แสดงว่าแบบจำลองทำงานได้ดีตรงไหน "
          "และล้มเหลวตรงไหน"},
  ]},

 "VFACE": {
  "self": [
   {"url": "https://dentistry.unc.edu/2026/03/31/annual-meeting-highlights-asod-research-accomplishments/",
    "ref": "Buisson, poster IADR 2026",
    "title": "Automated Classification of Facial Asymmetry, Identification of "
             "Regional Asymmetry Patterns",
    "fr": "Le poster présenté à la 104ᵉ session générale de l'IADR, San Diego. "
          "Le recensement de l'UNC Adams School of Dentistry en donne le titre "
          "et l'auteur ; le poster lui-même n'est déposé nulle part de public, et "
          "les archives de l'IADR ne sont pas indexées librement.",
    "en": "The poster presented at the 104th IADR General Session, San Diego. "
          "The UNC Adams School of Dentistry round-up gives its title and author; "
          "the poster itself is not deposited anywhere public, and the IADR "
          "archives are not freely indexed.",
    "pt": "O pôster apresentado na 104ª Sessão Geral da IADR, em San Diego. O resumo da "
          "UNC Adams School of Dentistry informa o título e o autor; o pôster em si não "
          "está depositado em nenhum lugar público, e os arquivos da IADR não são "
          "indexados livremente.",
    "ko": "샌디에이고에서 열린 제104차 IADR 총회에서 발표된 포스터입니다. UNC Adams "
          "School of Dentistry의 소식 모음에 제목과 저자가 나와 있습니다. 포스터 자체는 "
          "공개된 곳에 등록되어 있지 않으며, IADR 자료실은 자유롭게 검색되지 않습니다.",
    "th": "โปสเตอร์ที่นำเสนอในการประชุมใหญ่ IADR ครั้งที่ 104 ที่ซานดิเอโก สรุปข่าวของ UNC Adams "
          "School of Dentistry ระบุชื่อเรื่องและผู้เขียนไว้ ตัวโปสเตอร์ไม่ได้เผยแพร่ในที่สาธารณะใด "
          "และคลังเอกสารของ IADR ไม่ได้เปิดให้สืบค้นได้โดยเสรี"},
   {"url": "https://doi.org/10.1117/12.3087010",
    "ref": "SPIE Medical Imaging 2026",
    "title": "Automated classification of skeletal facial asymmetry in CBCT using "
             "a reproducible 3D Slicer workflow",
    "fr": "La seule publication qui décrit le pipeline. Payante, et à lire en "
          "sachant qu'elle décrit une méthode de classification différente de "
          "celle que le module embarque réellement.",
    "en": "The only publication describing the pipeline. Paywalled, and to be "
          "read knowing it describes a classification method different from the "
          "one the module actually ships.",
    "pt": "A única publicação que descreve o pipeline. É paga, e deve ser lida sabendo "
          "que descreve um método de classificação diferente do que o módulo de fato "
          "inclui.",
    "ko": "파이프라인을 설명하는 유일한 논문입니다. 유료이며, 모듈에 실제로 탑재된 것과 "
          "다른 분류 방법을 설명한다는 점을 알고 읽어야 합니다.",
    "th": "งานตีพิมพ์เพียงชิ้นเดียวที่อธิบายกระบวนการทำงานนี้ ต้องเสียค่าเข้าถึง "
          "และควรอ่านโดยทราบว่าบทความอธิบายวิธีจำแนกที่ต่างจากวิธีที่โมดูลใช้งานจริง"},
  ],
  "around": [
   {"url": "https://doi.org/10.1259/dmfr/13993523",
    "ref": "AlHadidi & Cevidanes, Dentomaxillofac Radiol 2011",
    "title": "Comparison of two methods for quantitative assessment of mandibular "
             "asymmetry using cone beam computed tomography image volumes",
    "fr": "Compare deux façons de mesurer l'asymétrie mandibulaire : miroir sur "
          "le plan médio-sagittal, ou miroir puis recalage sur la base du crâne. "
          "C'est la démarche que VFACE automatise.",
    "en": "Compares two ways of measuring mandibular asymmetry: mirroring on the "
          "mid-sagittal plane, or mirroring then registering on the cranial base. "
          "This is the approach VFACE automates.",
    "pt": "Compara duas formas de medir a assimetria mandibular: espelhamento no plano "
          "sagital mediano, ou espelhamento seguido de registro na base do crânio. É a "
          "abordagem que o VFACE automatiza.",
    "ko": "하악 비대칭을 측정하는 두 방법을 비교합니다. 정중시상면을 기준으로 거울상을 "
          "만드는 방법과, 거울상을 만든 뒤 두개저에서 정합하는 방법입니다. VFACE가 "
          "자동화하는 접근법입니다.",
    "th": "เปรียบเทียบสองวิธีในการวัดความไม่สมมาตรของขากรรไกรล่าง: "
          "การสร้างภาพสะท้อนบนระนาบกึ่งกลางซาจิตทัล "
          "หรือการสร้างภาพสะท้อนแล้วลงทะเบียนภาพบนฐานกะโหลกศีรษะ นี่คือแนวทางที่ VFACE "
          "ทำให้เป็นอัตโนมัติ"},
   {"url": "https://doi.org/10.1016/j.tripleo.2011.02.002",
    "ref": "Cevidanes et al., Oral Surg Oral Med Oral Pathol 2011",
    "title": "Three-dimensional quantification of mandibular asymmetry through "
             "cone-beam computerized tomography",
    "fr": "Quantifie l'asymétrie après miroir et recalage, et détaille ce que les "
          "écarts mesurés veulent dire cliniquement.",
    "en": "Quantifies asymmetry after mirroring and registration, and spells out "
          "what the measured gaps mean clinically.",
    "pt": "Quantifica a assimetria após espelhamento e registro, e explica o que as "
          "diferenças medidas significam clinicamente.",
    "ko": "거울상 생성과 정합 후 비대칭을 정량화하고, 측정된 차이가 임상적으로 무엇을 "
          "뜻하는지 설명합니다.",
    "th": "วัดปริมาณความไม่สมมาตรหลังการสร้างภาพสะท้อนและการลงทะเบียนภาพ "
          "และอธิบายว่าความต่างที่วัดได้มีความหมายทางคลินิกอย่างไร"},
   {"url": "https://doi.org/10.2319/040921-292.1",
    "ref": "Evangelista et al., Angle Orthodontist 2022",
    "title": "Prevalence of mandibular asymmetry in different skeletal sagittal "
             "patterns: A systematic review",
    "fr": "Prévalence de l'asymétrie mandibulaire selon le schéma squelettique "
          "sagittal — pour situer un patient par rapport à une population.",
    "en": "Prevalence of mandibular asymmetry across sagittal skeletal patterns — "
          "to place a patient against a population.",
    "pt": "Prevalência da assimetria mandibular nos diferentes padrões esqueléticos "
          "sagitais — para situar um paciente em relação a uma população.",
    "ko": "시상 골격 유형별 하악 비대칭의 유병률입니다. 환자를 모집단과 비교해 위치시킬 "
          "때 참고합니다.",
    "th": "ความชุกของความไม่สมมาตรของขากรรไกรล่างในรูปแบบโครงกระดูกแนวซาจิตทัลต่าง ๆ — "
          "เพื่อระบุตำแหน่งของผู้ป่วยเทียบกับประชากร"},
   {"url": "https://doi.org/10.1093/ejo/cjag012",
    "ref": "Peng et al., European Journal of Orthodontics 2026",
    "title": "Automated assessment of 3D facial asymmetry: a systematic review",
    "fr": "La revue systématique du problème : les méthodes automatiques "
          "existantes et ce qu'elles valent. Le meilleur point d'entrée récent.",
    "en": "The systematic review of the problem: the existing automated methods "
          "and how they perform. The best recent entry point.",
    "pt": "A revisão sistemática do problema: os métodos automáticos existentes e o "
          "desempenho de cada um. O melhor ponto de partida recente.",
    "ko": "이 문제에 대한 체계적 문헌고찰입니다. 기존 자동화 방법들과 그 성능을 "
          "정리합니다. 최근 자료 중 가장 좋은 입문 자료입니다.",
    "th": "การทบทวนวรรณกรรมอย่างเป็นระบบของปัญหานี้: วิธีอัตโนมัติที่มีอยู่และประสิทธิภาพของแต่ละวิธี "
          "เป็นจุดเริ่มต้นล่าสุดที่ดีที่สุด"},
  ]},

 "DOCShapeAXI": {
  "self": [
   {"url": "https://doi.org/10.1117/12.3007053",
    "ref": "Prieto et al., SPIE Medical Imaging 2024",
    "title": "ShapeAXI: Shape Analysis Explainability and Interpretability",
    "fr": "Le cadre que ce module pilote : classer une forme 3D, puis montrer "
          "quelle partie de la surface a emporté la décision.",
    "en": "The framework this module drives: classify a 3D shape, then show which "
          "part of the surface drove the decision.",
    "pt": "O framework que este módulo controla: classificar uma forma 3D e depois "
          "mostrar qual parte da superfície determinou a decisão.",
    "ko": "이 모듈이 구동하는 프레임워크입니다. 3D 형상을 분류한 뒤, 표면의 어느 부분이 "
          "결정을 이끌었는지 보여 줍니다.",
    "th": "เฟรมเวิร์กที่โมดูลนี้สั่งงาน: จำแนกรูปทรง 3 มิติ "
          "แล้วแสดงว่าส่วนใดของพื้นผิวเป็นตัวกำหนดการตัดสินใจ"},
  ],
  "around": [
   {"url": "https://doi.org/10.1016/j.jdent.2025.105689",
    "ref": "Mattos et al., Journal of Dentistry 2025",
    "title": "Explainable artificial intelligence to quantify adenoid hypertrophy "
             "and airway obstruction",
    "fr": "Le même cadre appliqué aux voies aériennes : un exemple complet de ce "
          "que produisent les cartes d'explication, et de la façon de les lire.",
    "en": "The same framework applied to the airway: a complete example of what "
          "the explanation maps produce, and how to read them.",
    "pt": "O mesmo framework aplicado às vias aéreas: um exemplo completo do que os "
          "mapas de explicação produzem e de como lê-los.",
    "ko": "같은 프레임워크를 기도에 적용한 연구입니다. 설명 맵이 무엇을 만들어 내는지, "
          "그리고 어떻게 읽는지 보여 주는 완결된 예시입니다.",
    "th": "เฟรมเวิร์กเดียวกันที่นำไปใช้กับทางเดินหายใจ: ตัวอย่างครบถ้วนของสิ่งที่แผนที่อธิบายผลสร้างขึ้น "
          "และวิธีอ่านแผนที่เหล่านั้น"},
   {"url": "https://doi.org/10.1038/s41598-023-43125-7",
    "ref": "Miranda et al., Scientific Reports 2023",
    "title": "Interpretable artificial intelligence for classification of alveolar "
             "bone defect in patients with cleft lip and palate",
    "fr": "Un autre cas clinique traité de la même façon, en accès libre.",
    "en": "Another clinical case handled the same way, open access.",
    "pt": "Outro caso clínico tratado da mesma forma, em acesso aberto.",
    "ko": "같은 방식으로 다룬 또 다른 임상 사례이며, 오픈 액세스입니다.",
    "th": "กรณีทางคลินิกอีกกรณีที่ใช้วิธีเดียวกัน เข้าถึงได้โดยเสรี"},
   {"url": "https://arxiv.org/abs/1610.02391",
    "ref": "Selvaraju et al., ICCV 2017",
    "title": "Grad-CAM: Visual Explanations from Deep Networks via Gradient-based "
             "Localization",
    "fr": "La méthode derrière les cartes de chaleur que le module affiche — et "
          "ses limites, qu'il vaut mieux connaître avant de les interpréter.",
    "en": "The method behind the heat maps the module displays — and its limits, "
          "worth knowing before interpreting them.",
    "pt": "O método por trás dos mapas de calor que o módulo exibe — e seus limites, "
          "que vale conhecer antes de interpretá-los.",
    "ko": "모듈이 표시하는 히트맵의 바탕이 되는 방법과 그 한계를 다룹니다. 히트맵을 "
          "해석하기 전에 알아 두는 것이 좋습니다.",
    "th": "วิธีเบื้องหลังแผนที่ความร้อน (heat map) ที่โมดูลแสดง — และข้อจำกัดของวิธีนี้ "
          "ซึ่งควรทราบก่อนตีความ"},
  ]},

 "CLIC": {
  "note": {
   "fr": "Le module n'a pas encore de publication : sa seule description publique "
         "est une page de projet NA-MIC.",
   "en": "The module has no publication yet: its only public description is a "
         "NA-MIC project page.",
   "pt": "O módulo ainda não tem publicação: sua única descrição pública é uma página "
         "de projeto NA-MIC.",
   "ko": "이 모듈은 아직 논문이 없습니다. 유일한 공개 설명은 NA-MIC 프로젝트 "
         "페이지입니다.",
   "th": "โมดูลนี้ยังไม่มีงานตีพิมพ์ คำอธิบายสาธารณะเพียงแหล่งเดียวคือหน้าโครงการของ NA-MIC"},
  "self": [
   {"url": "https://projectweek.na-mic.org/PW43_2025_Montreal/Projects/InterpretableDeepLearningForTheDetectionAndClassificationOfImpactedCaninesAndSeverityOfRootResorption/",
    "ref": "NA-MIC Project Week 43, Montréal 2025",
    "title": "Interpretable Deep Learning for the Detection and Classification of "
             "Impacted Canines and severity of root resorption",
    "fr": "Le rapport de projet : l'objectif, les données, et où en était le "
          "travail à ce moment-là.",
    "en": "The project report: the goal, the data, and where the work stood at "
          "that point.",
    "pt": "O relatório do projeto: o objetivo, os dados e em que ponto estava o "
          "trabalho naquele momento.",
    "ko": "프로젝트 보고서입니다. 목표, 데이터, 그리고 당시의 작업 진행 상황을 "
          "다룹니다.",
    "th": "รายงานโครงการ: เป้าหมาย ข้อมูล และความคืบหน้าของงาน ณ ขณะนั้น"},
  ],
  "around": [
   {"url": "https://arxiv.org/abs/1703.06870",
    "ref": "He et al., ICCV 2017",
    "title": "Mask R-CNN",
    "fr": "L'architecture que le module exécute : détecter des objets et en "
          "produire le masque en même temps.",
    "en": "The architecture the module runs: detect objects and produce their "
          "masks at the same time.",
    "pt": "A arquitetura que o módulo executa: detectar objetos e produzir suas "
          "máscaras ao mesmo tempo.",
    "ko": "이 모듈이 실행하는 구조입니다. 객체를 검출하는 동시에 그 마스크를 "
          "생성합니다.",
    "th": "สถาปัตยกรรมที่โมดูลใช้งาน: ตรวจจับวัตถุและสร้างมาสก์ของวัตถุไปพร้อมกัน"},
   {"url": "https://doi.org/10.1038/s41598-023-49613-0",
    "ref": "Swaity et al., Scientific Reports 2023",
    "title": "Deep learning driven segmentation of maxillary impacted canine on "
             "cone beam computed tomography images",
    "fr": "Le même problème traité par une autre équipe, avec les écarts mesurés "
          "sur une série indépendante.",
    "en": "The same problem addressed by another team, with the error measured on "
          "an independent series.",
    "pt": "O mesmo problema abordado por outra equipe, com o erro medido em uma série "
          "independente.",
    "ko": "다른 연구팀이 같은 문제를 다룬 연구로, 독립된 증례군에서 측정한 오차를 "
          "제시합니다.",
    "th": "ปัญหาเดียวกันที่ทีมวิจัยอื่นศึกษา พร้อมค่าความคลาดเคลื่อนที่วัดในกลุ่มตัวอย่างอิสระ"},
   {"url": "https://doi.org/10.1186/s12903-024-04718-4",
    "ref": "Pirayesh et al., BMC Oral Health 2024",
    "title": "A hierarchical deep learning approach for diagnosing impacted "
             "canine-induced root resorption",
    "fr": "Côté résorption radiculaire : comment la sévérité est graduée, et ce "
          "que ça vaut face à un observateur humain.",
    "en": "On the root resorption side: how severity is graded, and how that "
          "compares with a human observer.",
    "pt": "Do lado da reabsorção radicular: como a gravidade é graduada e como isso se "
          "compara a um observador humano.",
    "ko": "치근 흡수 측면을 다룹니다. 심각도를 어떻게 등급화하는지, 그리고 사람 "
          "관찰자와 비교하면 어떤지 보여 줍니다.",
    "th": "ด้านการละลายของรากฟัน: วิธีจัดระดับความรุนแรง และผลเมื่อเทียบกับผู้ประเมินที่เป็นมนุษย์"},
  ]},

 "SurgMovPred": {
  "note": {
   "fr": "Aucune publication ne décrit le module. Sa seule description publique "
         "est un rapport de projet NA-MIC, et les modèles qu'il exécute ne sont "
         "évalués nulle part.",
   "en": "No publication describes the module. Its only public description is a "
         "NA-MIC project report, and the models it runs are evaluated nowhere.",
   "pt": "Nenhuma publicação descreve o módulo. Sua única descrição pública é um "
         "relatório de projeto NA-MIC, e os modelos que ele executa não foram avaliados "
         "em lugar nenhum.",
   "ko": "이 모듈을 설명하는 논문은 없습니다. 유일한 공개 설명은 NA-MIC 프로젝트 "
         "보고서이며, 모듈이 실행하는 모델은 어디에서도 평가되지 않았습니다.",
   "th": "ไม่มีงานตีพิมพ์ใดอธิบายโมดูลนี้ คำอธิบายสาธารณะเพียงแหล่งเดียวคือรายงานโครงการของ NA-MIC "
         "และแบบจำลองที่โมดูลใช้งานไม่ได้รับการประเมินที่ใดเลย"},
  "self": [
   {"url": "https://projectweek.na-mic.org/PW45_2026_Boston/Projects/New3DSlicerModuleToPredictSurgeryMovementForMaxillofacialSurgery/",
    "ref": "NA-MIC Project Week 45, Boston 2026",
    "title": "New 3D Slicer Module to predict surgery movement for maxillofacial "
             "surgery",
    "fr": "Le rapport de projet : l'intention, les données de départ, et l'état "
          "du travail.",
    "en": "The project report: the intent, the starting data, and the state of "
          "the work.",
    "pt": "O relatório do projeto: a intenção, os dados iniciais e o estado do "
          "trabalho.",
    "ko": "프로젝트 보고서입니다. 의도, 출발 데이터, 작업 진행 상태를 다룹니다.",
    "th": "รายงานโครงการ: เจตนา ข้อมูลตั้งต้น และสถานะของงาน"},
  ],
  "around": [
   {"url": "https://doi.org/10.1111/ocr.12805",
    "ref": "de Oliveira et al., Orthod Craniofac Res 2024",
    "title": "Artificial intelligence as a prediction tool for orthognathic "
             "surgery assessment",
    "fr": "Le même laboratoire sur la même question, mais publié et évalué. À "
          "lire avant de se fier à une prédiction du module.",
    "en": "The same lab on the same question, but published and evaluated. Read "
          "it before trusting a prediction from the module.",
    "pt": "O mesmo laboratório sobre a mesma questão, mas publicado e avaliado. Leia "
          "antes de confiar em uma previsão do módulo.",
    "ko": "같은 연구실이 같은 질문을 다룬 연구이지만, 논문으로 발표되고 평가되었습니다. "
          "이 모듈의 예측을 신뢰하기 전에 읽어 보십시오.",
    "th": "ห้องปฏิบัติการเดียวกันศึกษาคำถามเดียวกัน แต่ได้รับการตีพิมพ์และประเมินผลแล้ว "
          "ควรอ่านก่อนเชื่อถือผลทำนายของโมดูล"},
   {"url": "https://doi.org/10.1186/s12903-023-02844-z",
    "ref": "Cheng et al., BMC Oral Health 2023",
    "title": "Prediction of orthognathic surgery plan from 3D cephalometric "
             "analysis via deep learning",
    "fr": "Une approche voisine en accès libre, avec les erreurs rapportées "
          "mesure par mesure.",
    "en": "A neighbouring approach, open access, with errors reported "
          "measurement by measurement.",
    "pt": "Uma abordagem próxima, em acesso aberto, com os erros relatados medida por "
          "medida.",
    "ko": "오픈 액세스로 공개된 유사한 접근법으로, 오차를 계측 항목별로 보고합니다.",
    "th": "แนวทางใกล้เคียงที่เข้าถึงได้โดยเสรี พร้อมรายงานค่าความคลาดเคลื่อนทีละค่าการวัด"},
  ]},

 "AutoCrop3D": {
  "note": {
   "fr": "Module utilitaire : il n'a pas de publication propre, et n'en demande "
         "pas. Il applique en série le recadrage que Slicer sait déjà faire.",
   "en": "A utility module: it has no publication of its own and needs none. It "
         "applies in batch the cropping Slicer already knows how to do.",
   "pt": "Um módulo utilitário: não tem publicação própria e não precisa de uma. Ele "
         "aplica em lote o recorte que o Slicer já sabe fazer.",
   "ko": "유틸리티 모듈입니다. 자체 논문이 없으며 필요하지도 않습니다. Slicer가 이미 할 "
         "수 있는 자르기(cropping)를 일괄로 적용합니다.",
   "th": "โมดูลอรรถประโยชน์: ไม่มีงานตีพิมพ์ของตัวเองและไม่จำเป็นต้องมี "
         "โมดูลนี้ทำการครอปภาพแบบกลุ่มในแบบที่ Slicer ทำได้อยู่แล้ว"},
  "self": [],
  "around": [
   {"url": "https://slicer.readthedocs.io/en/latest/user_guide/modules/cropvolume.html",
    "ref": "Documentation 3D Slicer",
    "title": "Crop Volume",
    "fr": "Le module Slicer sous-jacent : ce que veulent dire l'interpolation, le "
          "facteur d'échantillonnage et l'isotropie que vous retrouvez ici.",
    "en": "The underlying Slicer module: what the interpolation, sampling factor "
          "and isotropy you see here actually mean.",
    "pt": "O módulo do Slicer por trás deste: o que realmente significam a "
          "interpolação, o fator de amostragem e a isotropia que você encontra aqui.",
    "ko": "이 모듈의 바탕이 되는 Slicer 모듈입니다. 여기서 보이는 보간, 샘플링 계수, "
          "등방성이 실제로 무엇을 뜻하는지 설명합니다.",
    "th": "โมดูลของ Slicer ที่อยู่เบื้องหลัง: ความหมายที่แท้จริงของการประมาณค่าในช่วง (interpolation) "
          "ตัวคูณการสุ่มตัวอย่าง และความเป็นไอโซทรอปิกที่คุณเห็นในหน้านี้"},
   {"url": "https://doi.org/10.1111/ocr.12895",
    "ref": "Barone et al., Orthod Craniofac Res 2025",
    "title": "Deep Learning-Based Three-Dimensional Analysis Reveals Distinct "
             "Patterns of Condylar Remodelling After Orthognathic Surgery in "
             "Skeletal Class III Patients",
    "fr": "Un travail du laboratoire où ce recadrage en série sert d'étape "
          "préparatoire — un exemple de ce à quoi le module est utile.",
    "en": "A lab study where this batch cropping is a preparation step — an "
          "example of what the module is good for.",
    "pt": "Um estudo do laboratório em que esse recorte em lote é uma etapa de "
          "preparação — um exemplo da utilidade do módulo.",
    "ko": "이 일괄 자르기를 준비 단계로 사용한 연구실의 연구입니다. 이 모듈의 쓰임새를 "
          "보여 주는 예입니다.",
    "th": "งานวิจัยของห้องปฏิบัติการที่ใช้การครอปภาพแบบกลุ่มนี้เป็นขั้นเตรียมข้อมูล — "
          "ตัวอย่างของประโยชน์ของโมดูล"},
  ]},

 "AutoMatrix": {
  "note": {
   "fr": "Aucune publication, et il n'y a rien à publier : le module applique des "
         "matrices de transformation à des fichiers, en série. Ce qui compte est "
         "de savoir ce qu'est une matrice dans Slicer et dans quel repère elle "
         "s'exprime.",
   "en": "No publication, and nothing to publish: the module applies "
         "transformation matrices to files, in batch. What matters is knowing "
         "what a matrix is in Slicer and which coordinate frame it is in.",
   "pt": "Não há publicação, e não há o que publicar: o módulo aplica matrizes de "
         "transformação a arquivos, em lote. O que importa é saber o que é uma matriz "
         "no Slicer e em qual sistema de coordenadas ela está.",
   "ko": "논문은 없으며, 발표할 내용도 없습니다. 이 모듈은 변환 행렬을 파일에 일괄 "
         "적용합니다. 중요한 것은 Slicer에서 행렬이 무엇인지, 그리고 어느 좌표계로 "
         "표현되는지 아는 것입니다.",
   "th": "ไม่มีงานตีพิมพ์ และไม่มีอะไรให้ตีพิมพ์: โมดูลนี้นำเมทริกซ์การแปลงไปใช้กับไฟล์แบบกลุ่ม "
         "สิ่งสำคัญคือการรู้ว่าเมทริกซ์ใน Slicer คืออะไร และอยู่ในระบบพิกัดใด"},
  "self": [],
  "around": [
   {"url": "https://slicer.readthedocs.io/en/latest/user_guide/modules/transforms.html",
    "ref": "Documentation 3D Slicer",
    "title": "Transforms",
    "fr": "Ce qu'est une transformation linéaire dans Slicer, comment elle "
          "s'applique et comment on l'inverse.",
    "en": "What a linear transform is in Slicer, how it is applied and how it is "
          "inverted.",
    "pt": "O que é uma transformação linear no Slicer, como ela é aplicada e como é "
          "invertida.",
    "ko": "Slicer에서 선형 변환이 무엇인지, 어떻게 적용하고 어떻게 역변환하는지 "
          "설명합니다.",
    "th": "การแปลงเชิงเส้นใน Slicer คืออะไร นำไปใช้อย่างไร และหาค่าผกผันอย่างไร"},
   {"url": "https://slicer.readthedocs.io/en/latest/user_guide/coordinate_systems.html",
    "ref": "Documentation 3D Slicer",
    "title": "Coordinate systems",
    "fr": "RAS, LPS, et pourquoi une matrice correcte appliquée dans le mauvais "
          "repère retourne votre patient.",
    "en": "RAS, LPS, and why a correct matrix applied in the wrong frame flips "
          "your patient.",
    "pt": "RAS, LPS, e por que uma matriz correta aplicada no sistema de coordenadas "
          "errado inverte o seu paciente.",
    "ko": "RAS와 LPS, 그리고 올바른 행렬도 잘못된 좌표계에 적용하면 환자가 뒤집히는 "
          "이유를 설명합니다.",
    "th": "RAS, LPS และเหตุใดเมทริกซ์ที่ถูกต้องแต่ใช้ในระบบพิกัดผิดจึงทำให้ภาพผู้ป่วยกลับด้าน"},
  ]},

 "CNE": {
  "note": {
   "fr": "Le module n'a pas de publication, et les modèles qu'il exécute sont des "
         "fine-tunes du laboratoire déposés sans model card : ni jeu "
         "d'entraînement décrit, ni évaluation. Les lectures ci-dessous disent ce "
         "qu'on sait, en général, de la fiabilité de ce genre d'extraction.",
   "en": "The module has no publication, and the models it runs are lab "
         "fine-tunes uploaded without a model card: no described training set, no "
         "evaluation. The readings below give what is generally known about how "
         "reliable this kind of extraction is.",
   "pt": "O módulo não tem publicação, e os modelos que ele executa são fine-tunes do "
         "laboratório publicados sem model card: nenhum conjunto de treinamento "
         "descrito, nenhuma avaliação. As leituras abaixo reúnem o que se sabe, em "
         "geral, sobre a confiabilidade desse tipo de extração.",
   "ko": "이 모듈은 논문이 없으며, 실행하는 모델은 연구실에서 미세조정한 것으로 모델 "
         "카드 없이 업로드되었습니다. 학습 데이터셋에 대한 설명도, 평가도 없습니다. "
         "아래 자료는 이런 종류의 추출이 일반적으로 얼마나 신뢰할 만한지에 대해 알려진 "
         "내용을 담고 있습니다.",
   "th": "โมดูลนี้ไม่มีงานตีพิมพ์ และแบบจำลองที่ใช้เป็นแบบจำลองที่ห้องปฏิบัติการปรับแต่ง (fine-tune) "
         "ซึ่งอัปโหลดโดยไม่มี model card: ไม่มีคำอธิบายชุดข้อมูลฝึก และไม่มีการประเมินผล "
         "เอกสารด้านล่างสรุปสิ่งที่ทราบโดยทั่วไปเกี่ยวกับความน่าเชื่อถือของการสกัดข้อมูลประเภทนี้"},
  "self": [],
  "around": [
   {"url": "https://doi.org/10.1038/s41746-024-01233-2",
    "ref": "Wiest et al., npj Digital Medicine 2024",
    "title": "Privacy-preserving large language models for structured medical "
             "information retrieval",
    "fr": "Exactement l'usage visé — extraire des champs structurés d'un compte "
          "rendu avec un modèle qui tourne en local — et ce que ça donne "
          "réellement.",
    "en": "Exactly the intended use — pulling structured fields out of a report "
          "with a locally-run model — and what it actually achieves.",
    "pt": "Exatamente o uso pretendido — extrair campos estruturados de um relatório "
          "com um modelo executado localmente — e o que isso de fato alcança.",
    "ko": "이 모듈이 의도한 용도, 즉 로컬에서 실행하는 모델로 보고서에서 구조화된 "
          "항목을 추출하는 일을 정확히 다루며, 실제로 어느 정도의 성과를 내는지 보여 "
          "줍니다.",
    "th": "ตรงกับการใช้งานที่ตั้งใจไว้ทุกประการ — "
          "การดึงข้อมูลที่มีโครงสร้างออกจากรายงานด้วยแบบจำลองที่ทำงานบนเครื่อง — และผลที่ได้จริง"},
   {"url": "https://doi.org/10.1136/bmjhci-2025-101894",
    "ref": "Panchal et al., BMJ Health & Care Informatics 2026",
    "title": "Benchmarking large language models for de-identification of "
             "electronic health record notes",
    "fr": "Une comparaison chiffrée de plusieurs modèles sur des notes "
          "cliniques : où ils se trompent, et sur quels types de champs.",
    "en": "A quantified comparison of several models on clinical notes: where "
          "they fail, and on which kinds of field.",
    "pt": "Uma comparação quantitativa de vários modelos em notas clínicas: onde eles "
          "erram e em quais tipos de campo.",
    "ko": "임상 기록을 대상으로 여러 모델을 정량적으로 비교합니다. 모델이 어디서, 어떤 "
          "종류의 항목에서 실패하는지 보여 줍니다.",
    "th": "การเปรียบเทียบเชิงปริมาณของแบบจำลองหลายตัวบนบันทึกทางคลินิก: แบบจำลองผิดพลาดตรงไหน "
          "และกับข้อมูลประเภทใด"},
   {"url": "https://doi.org/10.2196/57828",
    "ref": "Dorémus et al., JMIR 2025",
    "title": "Harnessing Moderate-Sized Language Models for Reliable Patient Data "
             "Deidentification in Emergency Department Records",
    "fr": "Ce qu'on peut attendre d'un modèle de la taille de ceux employés ici, "
          "plutôt que d'un très gros modèle distant.",
    "en": "What to expect from a model the size of those used here, rather than "
          "from a very large remote one.",
    "pt": "O que esperar de um modelo do tamanho dos usados aqui, em vez de um modelo "
          "remoto muito grande.",
    "ko": "매우 큰 원격 모델이 아니라, 여기서 쓰는 정도 크기의 모델에게 무엇을 기대할 "
          "수 있는지 다룹니다.",
    "th": "สิ่งที่คาดหวังได้จากแบบจำลองขนาดเท่าที่ใช้ที่นี่ แทนที่จะเป็นแบบจำลองระยะไกลขนาดใหญ่มาก"},
  ]},

 "MedX": {
  "self": [
   {"url": "https://doi.org/10.1007/978-3-032-05479-1_5",
    "ref": "Gaydamour et al., CLIP 2025 (LNCS 16126)",
    "title": "AI-Driven Multimodal TMJ Patient Modeling: From Unstructured Notes "
             "to Precision Treatment",
    "fr": "Le papier de la chaîne dont MedX est le maillon texte : passer de "
          "comptes rendus libres à des données exploitables.",
    "en": "The paper for the pipeline MedX is the text link in: going from free "
          "reports to usable data.",
    "pt": "O artigo do pipeline no qual o MedX é o elo de texto: passar de relatórios "
          "livres a dados utilizáveis.",
    "ko": "MedX가 텍스트 처리 단계를 맡는 파이프라인의 논문입니다. 자유 형식 보고서를 "
          "활용 가능한 데이터로 바꾸는 과정을 다룹니다.",
    "th": "บทความของกระบวนการทำงานที่ MedX เป็นส่วนจัดการข้อความ: "
          "เปลี่ยนรายงานแบบอิสระให้เป็นข้อมูลที่นำไปใช้ได้"},
  ],
  "around": [
   {"url": "https://arxiv.org/abs/1910.13461",
    "ref": "Lewis et al., ACL 2020",
    "title": "BART: Denoising Sequence-to-Sequence Pre-training for Natural "
             "Language Generation, Translation, and Comprehension",
    "fr": "Le modèle amont que MedX affine. Explique ce que le résumé sait faire "
          "— et qu'il reformule, donc qu'il peut inventer.",
    "en": "The upstream model MedX fine-tunes. Explains what the summariser can "
          "do — and that it rephrases, so it can invent.",
    "pt": "O modelo de base que o MedX ajusta (fine-tune). Explica o que o sumarizador "
          "consegue fazer — e que ele reformula, portanto pode inventar.",
    "ko": "MedX가 미세조정하는 원본 모델입니다. 요약기가 무엇을 할 수 있는지, 그리고 "
          "문장을 바꿔 쓰기 때문에 없는 내용을 지어낼 수 있다는 점을 설명합니다.",
    "th": "แบบจำลองต้นทางที่ MedX นำมาปรับแต่ง อธิบายว่าตัวสรุปความทำอะไรได้ — "
          "และเนื่องจากมันเรียบเรียงใหม่ จึงอาจแต่งเนื้อหาขึ้นเองได้"},
   {"url": "https://doi.org/10.1053/j.sodo.2021.05.004",
    "ref": "Bianchi et al., Seminars in Orthodontics 2021",
    "title": "Decision Support Systems in Temporomandibular Joint Osteoarthritis",
    "fr": "Le contexte clinique : à quelle décision ces données extraites sont "
          "censées servir.",
    "en": "The clinical context: which decision these extracted data are meant to "
          "serve.",
    "pt": "O contexto clínico: a qual decisão esses dados extraídos devem servir.",
    "ko": "임상적 맥락을 다룹니다. 추출된 데이터가 어떤 결정을 돕기 위한 것인지 "
          "설명합니다.",
    "th": "บริบททางคลินิก: ข้อมูลที่สกัดออกมามีไว้เพื่อสนับสนุนการตัดสินใจใด"},
  ]},

 "MedicalDataAnonymizer": {
  "note": {
   "fr": "Pas de publication : le module assemble des briques existantes "
         "(Presidio, spaCy). Ce qui mérite d'être lu, c'est ce que ces briques "
         "laissent passer — une anonymisation automatique n'est jamais complète.",
   "en": "No publication: the module assembles existing pieces (Presidio, spaCy). "
         "What is worth reading is what those pieces let through — automatic "
         "anonymisation is never complete.",
   "pt": "Não há publicação: o módulo combina componentes existentes (Presidio, spaCy). "
         "O que vale a pena ler é o que esses componentes deixam passar — a "
         "anonimização automática nunca é completa.",
   "ko": "논문은 없습니다. 이 모듈은 기존 구성 요소(Presidio, spaCy)를 조합합니다. 읽어 "
         "볼 가치가 있는 것은 이 구성 요소들이 놓치는 부분입니다. 자동 익명화는 결코 "
         "완전하지 않습니다.",
   "th": "ไม่มีงานตีพิมพ์: โมดูลนี้ประกอบจากส่วนประกอบที่มีอยู่แล้ว (Presidio, spaCy) "
         "สิ่งที่ควรอ่านคือข้อมูลที่ส่วนประกอบเหล่านี้ปล่อยหลุดไป — การทำให้ข้อมูลนิรนามโดยอัตโนมัติไม่มีวันสมบูรณ์"},
  "self": [],
  "around": [
   {"url": "https://doi.org/10.25259/SNI_459_2025",
    "ref": "Alrazihi et al., Surgical Neurology International 2025",
    "title": "Evaluating the accuracy of automated and semi-automated "
             "anonymization tools for unstructured health records",
    "fr": "Évalue justement Presidio sur des dossiers libres : le taux de données "
          "identifiantes qui survivent au passage.",
    "en": "Evaluates Presidio itself on free-text records: the share of "
          "identifying data that survives the pass.",
    "pt": "Avalia o próprio Presidio em prontuários de texto livre: a proporção de "
          "dados identificadores que sobrevive ao processamento.",
    "ko": "자유 텍스트 기록에서 Presidio 자체를 평가합니다. 처리 후에도 남는 식별 "
          "정보의 비율을 보여 줍니다.",
    "th": "ประเมิน Presidio โดยตรงบนเวชระเบียนแบบข้อความอิสระ: "
          "สัดส่วนของข้อมูลระบุตัวตนที่ยังหลงเหลืออยู่หลังการประมวลผล"},
   {"url": "https://doi.org/10.1016/j.jbi.2015.07.020",
    "ref": "Stubbs & Uzuner, J Biomed Inform 2015",
    "title": "Annotating longitudinal clinical narratives for de-identification: "
             "The 2014 i2b2/UTHealth corpus",
    "fr": "Le corpus de référence du domaine et son schéma d'annotation : ce qui "
          "compte, ou non, comme donnée identifiante.",
    "en": "The field's reference corpus and its annotation scheme: what counts, "
          "and what does not, as identifying data.",
    "pt": "O corpus de referência da área e seu esquema de anotação: o que conta, e o "
          "que não conta, como dado identificador.",
    "ko": "이 분야의 기준 코퍼스와 그 주석 체계입니다. 무엇이 식별 정보에 해당하고 "
          "무엇이 해당하지 않는지 정의합니다.",
    "th": "คลังข้อมูลอ้างอิงของสาขานี้และรูปแบบการกำกับข้อมูล: สิ่งใดนับเป็นข้อมูลระบุตัวตน และสิ่งใดไม่นับ"},
   {"url": "https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html",
    "ref": "U.S. Department of Health & Human Services",
    "title": "Guidance Regarding Methods for De-identification of Protected "
             "Health Information",
    "fr": "La règle HIPAA elle-même : les 18 identifiants à retirer, et les deux "
          "seules méthodes qui valent juridiquement.",
    "en": "The HIPAA rule itself: the 18 identifiers to remove, and the only two "
          "methods that hold legally.",
    "pt": "A própria regra da HIPAA: os 18 identificadores a remover e os dois únicos "
          "métodos com validade legal.",
    "ko": "HIPAA 규정 자체입니다. 제거해야 할 18가지 식별자와, 법적으로 인정되는 두 "
          "가지 방법만을 제시합니다.",
    "th": "ตัวกฎ HIPAA เอง: ตัวระบุ 18 ประเภทที่ต้องลบออก และสองวิธีเท่านั้นที่มีผลทางกฎหมาย"},
  ]},

 "Agent": {
  "note": {
   "fr": "Pas de publication : le module est un travail en cours, décrit par un "
         "seul rapport de projet NA-MIC.",
   "en": "No publication: the module is work in progress, described by a single "
         "NA-MIC project report.",
   "pt": "Não há publicação: o módulo é um trabalho em andamento, descrito por um único "
         "relatório de projeto NA-MIC.",
   "ko": "논문은 없습니다. 이 모듈은 개발 중이며, NA-MIC 프로젝트 보고서 하나로만 "
         "설명되어 있습니다.",
   "th": "ไม่มีงานตีพิมพ์: โมดูลนี้อยู่ระหว่างการพัฒนา และมีเพียงรายงานโครงการของ NA-MIC "
         "ฉบับเดียวที่อธิบายไว้"},
  "self": [
   {"url": "https://projectweek.na-mic.org/PW45_2026_Boston/Projects/AiAgentForSlicerautomateddentaltools/",
    "ref": "NA-MIC Project Week 45, Boston 2026",
    "title": "AI-Agent for SlicerAutomatedDentalTools",
    "fr": "Le rapport de projet : ce que l'agent est censé savoir faire, et "
          "jusqu'où le travail est allé.",
    "en": "The project report: what the agent is meant to do, and how far the "
          "work got.",
    "pt": "O relatório do projeto: o que o agente deve ser capaz de fazer e até onde o "
          "trabalho chegou.",
    "ko": "프로젝트 보고서입니다. 에이전트가 무엇을 하도록 설계되었는지, 작업이 "
          "어디까지 진행되었는지 다룹니다.",
    "th": "รายงานโครงการ: สิ่งที่เอเจนต์ควรทำได้ และงานคืบหน้าไปถึงไหนแล้ว"},
  ],
  "around": [
   {"url": "https://arxiv.org/abs/2505.09388",
    "ref": "Qwen Team, arXiv 2025",
    "title": "Qwen3 Technical Report",
    "fr": "Le modèle qui décide vers quel outil vous envoyer et qui en extrait "
          "les paramètres.",
    "en": "The model that decides which tool to send you to and extracts its "
          "parameters.",
    "pt": "O modelo que decide para qual ferramenta enviar você e extrai os parâmetros "
          "dela.",
    "ko": "어느 도구로 안내할지 결정하고 그 도구의 매개변수를 추출하는 모델입니다.",
    "th": "แบบจำลองที่ตัดสินว่าจะส่งคุณไปยังเครื่องมือใด และสกัดพารามิเตอร์ของเครื่องมือนั้น"},
   {"url": "https://arxiv.org/abs/1908.10084",
    "ref": "Reimers & Gurevych, EMNLP 2019",
    "title": "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
    "fr": "Comment une question est comparée à la documentation indexée : c'est "
          "l'étape qui décide de ce que l'agent a sous les yeux avant de répondre.",
    "en": "How a question is compared against the indexed documentation: the step "
          "that decides what the agent has in front of it before answering.",
    "pt": "Como uma pergunta é comparada com a documentação indexada: a etapa que "
          "decide o que o agente tem diante de si antes de responder.",
    "ko": "질문을 색인된 문서와 어떻게 비교하는지 설명합니다. 에이전트가 답하기 전에 "
          "무엇을 보게 될지 결정하는 단계입니다.",
    "th": "วิธีเปรียบเทียบคำถามกับเอกสารที่จัดทำดัชนีไว้: "
          "ขั้นตอนที่กำหนดว่าเอเจนต์จะมีข้อมูลใดอยู่ตรงหน้าก่อนตอบ"},
   {"url": "https://arxiv.org/abs/1901.04085",
    "ref": "Nogueira & Cho, arXiv 2019",
    "title": "Passage Re-ranking with BERT",
    "fr": "Le reclassement appliqué ensuite aux passages retrouvés, qui améliore "
          "nettement ce qui remonte en tête.",
    "en": "The re-ranking then applied to the retrieved passages, which markedly "
          "improves what comes out on top.",
    "pt": "A reclassificação aplicada em seguida aos trechos recuperados, que melhora "
          "nitidamente o que aparece no topo.",
    "ko": "검색된 구절에 이어서 적용하는 재순위화로, 상위에 오르는 결과를 크게 "
          "개선합니다.",
    "th": "การจัดอันดับใหม่ที่ใช้กับข้อความที่ค้นคืนมา ซึ่งช่วยปรับปรุงผลลัพธ์อันดับต้น ๆ ได้อย่างชัดเจน"},
  ]},
}


# Vidéos de la chaîne YouTube « DCBIA Videos ».
# Identifiant, titre et durée vérifiés un par un (oEmbed + page watch) le 22/09/2026.
# « sec » sert à distinguer un vrai tutoriel d'un aperçu de trente secondes :
# les deux sont utiles, mais pas au même moment.
VIDEOS = {
 "FlexReg":   [("Ye9KcT-2DCI", "Discover the new features of FlexReg", 112)],
 "ALI":       [("A4NX1x7mEvo", "ALICBCT", 229),
               ("BpsIt9zDr30", "ALIIOS", 172)],
 "AMASSS":    [("Sg6oaOclOV8", "AMASSS - Automatic Multi-Anatomical Skull Structure Segmentation", 251),
               ("d6penNStUQE", "AMASSS RC Seg tutorial", 308)],
 "ASO":       [("91cnUpKiATc", "Automated Standardized Orientation (ASOCBCT) - Tutorial", 429)],
 "AREG_CBCT": [("bHyEoNz-2yg", "Automated Registration for CBCT (ARegCBCT) - Tutorial", 839)],
 "AREG_IOSCBCT": [("WIj6pCaRWhk", "Automated registration of intra oral scan with CBCT using an "
                   "accurate and quick workflow", 45)],
 "VFACE":     [("1nac4mn7S3E", "Classify facial Asymmetry and longitudinal studies, here is VFACE "
                "the new tool who do both", 33)],
 "SurgMovPred": [("Stg8eEg8UAA", "Surgical Movement Prediction: Machine learning model to help "
                  "surgery preparation", 28)],
 "CNE":       [("4I84dCcgRGw", "CNE (Clinical notes extraction) to summarize your notes and "
                "extract common data elements", 34)],
 "MedicalDataAnonymizer": [("5hZDaXGhPVY", "Medical Data Anonymizer: Your AI model who anonymize "
                            "all your medical text files", 41)],
 "Agent":     [("-CW8tnLyPHU", "AI Agent directly in 3D Slicer to help you learn dental and "
                "cranofacial imaging", 30)],
}

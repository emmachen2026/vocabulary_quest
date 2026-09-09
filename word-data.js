(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  root.VocabularyData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const parsePageList = (grade, text, pageGroups) => text.trim().split(/\s+/).map(entry => {
    const splitAt = entry.lastIndexOf(':');
    const word = entry.slice(0, splitAt).toLowerCase();
    const sourcePage = Number(entry.slice(splitAt + 1));
    const unitIndex = pageGroups.findIndex(group => group.includes(sourcePage));
    if (unitIndex < 0) throw new Error(`Cannot map ${word} on page ${sourcePage} in G${grade}`);
    return { grade, unit: unitIndex + 1, word, sourcePage };
  });

  const fromUnits = (grade, pages, units) => units.flatMap((words, unitIndex) =>
    words.map(word => ({ grade, unit: unitIndex + 1, word: word.toLowerCase(), sourcePage: pages[unitIndex] }))
  );

  const fromUnitsWithSourceIndex = (grade, units, sourceEntries) => {
    const sourceByWord = Object.fromEntries(sourceEntries.map(item => [item.word, item.sourcePage]));
    return units.flatMap((words, unitIndex) => words.map(word => ({
      grade,
      unit: unitIndex + 1,
      word: word.toLowerCase(),
      sourcePage: sourceByWord[word.toLowerCase()]
    })));
  };

  const G1_PAGES = [6, 14, 24, 32, 42, 50, 60, 68, 78, 86, 96, 104].map(page => [page]);
  const G1_SOURCE_ENTRIES = parsePageList(1, `
    anxious:86 applause:60 area:24 argue:104 attach:78
    blush:42 bold:6 burst:50
    celebrate:96 chatter:42 clutch:104 comfort:96 complain:24 complete:78 coward:6 cozy:32 creak:86 create:78
    dainty:78 damage:78 dart:14 delighted:68 destroy:6 doze:42 drench:42 drowsy:86 dusk:14
    edge:78 empty:6 examine:50 exchange:86 exhausted:104
    fasten:50 fierce:32 flee:6 fog:14 footprint:86 fortune:6 frantic:50 freezing:32 furious:104
    gasp:6 gather:24 gently:104 grateful:68 grin:6 groan:68 gulp:14
    hatch:32 host:14 howl:32 huddle:32 hunt:32
    injury:96 instrument:60
    jealous:78 journey:104 judge:50
    limp:86 lively:60 loosen:104
    market:24 mischief:68 misty:78 monument:96
    nervous:60
    peer:42 perform:60 plead:86 polish:96 polite:86 price:24 protect:32
    rapid:24 remove:104 rescue:96 ripe:24 roam:78 role:60 romp:68 rude:14
    scold:14 seek:96 selfish:68 seller:24 serious:14 sharp:6 shock:50 shriek:60 silent:78 slide:32
    slippery:42 sly:14 sneaky:6 space:50 splendid:68 spread:50 sprinkle:68 squirm:50 stare:6 startle:42 stormy:68 stumble:42 stun:68 surround:24 sway:60 swift:42 symbol:96
    tangle:50 temperature:32 tidy:96 timid:60 traveler:104 trust:86
    upset:14
    weary:14 whimper:86 whirl:60 wrap:104
    yank:24
  `, G1_PAGES);
  const G1 = fromUnitsWithSourceIndex(1, [
    ['sharp','bold','stare','coward','flee','grin','fortune','sneaky','empty','gasp'],
    ['host','scold','rude','serious','dart','sly','fog','gulp','weary','upset'],
    ['market','seller','area','price','ripe','rapid','surround','complain','yank','gather'],
    ['temperature','protect','hunt','fierce','huddle','howl','freezing','hatch','cozy','slide'],
    ['chatter','blush','swift','startle','peer','drench','stumble','dusk','slippery','doze'],
    ['squirm','burst','tangle','examine','judge','space','fasten','frantic','shock','spread'],
    ['timid','instrument','sway','perform','nervous','role','lively','whirl','shriek','applause'],
    ['mischief','grateful','stun','splendid','selfish','groan','romp','stormy','delighted','sprinkle'],
    ['jealous','roam','misty','create','dainty','complete','edge','attach','silent','damage'],
    ['footprint','creak','anxious','whimper','plead','limp','trust','exchange','polite','drowsy'],
    ['symbol','tidy','polish','destroy','rescue','injury','comfort','seek','celebrate','monument'],
    ['argue','clutch','exhausted','furious','gently','journey','loosen','remove','traveler','wrap']
  ], G1_SOURCE_ENTRIES);

  const G2_PAGES = [6, 14, 28, 36, 50, 58, 76, 84, 98, 106, 120, 128, 142, 150];
  const G2 = fromUnits(2, G2_PAGES, [
    ['branch','brave','dash','evening','greedy','pass','present','stream','trail','wise'],
    ['bench','bridge','cross','crowd','deep','fresh','frown','signal','travel','worry'],
    ['beach','center','finally','idea','ocean','seashell','stack','tiny','wave','wonder'],
    ['arrive','clear','enormous','exactly','float','midnight','rainbow','snowstorm','weekend','whisper'],
    ['bright','chew','flour','forest','hour','inn','island','nibble','pale','warn'],
    ['agree','bare','famous','feast','gentle','hero','leader','notice','search','weak'],
    ['alarm','collect','damp','insect','plant','safe','scatter','soil','team','tool'],
    ['dive','enemy','frighten','herd','pack','prove','seal','smooth','soar','steady'],
    ['calm','cheer','dawn','entire','fair','field','harm','pain','shiver','tremble'],
    ['board','curious','dangerous','doubt','eager','fear','leap','screech','squeeze','village'],
    ['beam','carve','den','lean','odd','proper','scrape','steer','tender','tense'],
    ['escape','honest','label','modern','object','pitch','select','sniff','stable','steep'],
    ['accept','address','difficult','excuse','expert','hollow','relax','section','stamp','whole'],
    ['admire','attach','handle','major','passenger','prepare','separate','similar','slender','task']
  ]);

  const LEVEL_PAGES = [[8,9],[18,19],[28,29],[38,39],[48,49],[58,59],[70,71],[80,81],[90,91],[100,101],[110,111],[120,121],[132,133],[142,143],[152,153],[162,163],[172,173],[182,183]];
  const G3 = parsePageList(3, `
    ability:90 absorb:172 abundant:152 accuse:70 active:28 actual:100 admirable:142 advantage:162 aim:18 allow:8 amateur:172 ambition:162 ancient:80 approach:110 approve:110 arch:132 atmosphere:48 audible:120 authentic:132 automatic:142 avoid:90 aware:18
    bargain:28 barrier:152 bashful:90 bitter:8 boast:182 border:58 brief:90 brilliant:48 brink:100
    capture:38 certain:58 channel:172 chill:100 clarify:132 clasp:58 clever:70 climate:80 cling:80 coast:70 common:8 compete:90
    conceive:152 conquer:100 consider:91 consume:120 convince:48 coward:38 custom:80
    decay:80 declare:132 defeat:18 delicate:70 delightful:91 depart:58 devotion:142 distant:142 disturb:81 dreary:142 drift:18
    elegant:172 eloquent:182 endure:48 exclaim:38 exhaust:143 explore:70 expose:81
    faint:8 fearsome:162 fierce:58 firm:8 force:9 formal:152 fortunate:100 fury:101
    gasp:28 glance:48 glide:120 glisten:182 gloomy:38 glory:110 goal:9 grace:172 grant:132 grave:133
    harsh:49 honor:91
    ideal:182 imitate:71 imply:162 infectious:183 inquire:152 insist:39 inspect:173 intend:101 invest:183
    journey:59
    kindle:143
    lame:173 locate:183 loyal:28
    magnificent:110 meek:111 merit:163 mild:19 modest:133
    negotiate:163
    observe:59 opponent:133 origin:120
    passage:39 patient:9 pause:19 penalize:153 perform:81 picturesque:153 pierce:71 plunge:49 precious:49 predator:153 predict:143 prefer:9 prevent:120 privilege:153 prompt:111 punctuate:121 purify:163
    rare:71 reflex:91 refuse:19 remark:91 remote:81 representative:121 resource:28 restless:39 revive:111 revoke:163 ripple:183 route:19 ruin:19
    scorn:121 sensitive:29 separation:143 shallow:39 shatter:39 slumber:153 solid:19 stout:121 struggle:29 stunt:143 sufficient:183 superb:59 suspend:173 swift:49 symbol:71
    talent:39 timid:81 tiresome:173 trace:9 tradition:111 tranquil:173 treasure:59 triumph:71
    unite:49 uproar:183
    valid:133 value:29 vary:29 vibrant:100
    wander:29 watchful:111 wisdom:59 wit:101 woe:121 wreckage:111 wretched:163
    yearn:133 defiant:162 pattern:101
  `, LEVEL_PAGES);

  const G4 = parsePageList(4, `
    abide:182 absolute:142 abstract:132 accurate:70 adopt:152 adorn:162 agile:152 alert:70 ally:132 ambush:38 analyze:152 ancestor:70 annual:18 antique:48 appoint:132 appropriate:162 approximate:172 arena:142 assemble:162 assist:152 attentive:132 attractive:28 awkward:80
    babble:152 baggage:48 basic:18 blockade:110 blossom:58 bonus:132 bristle:120 burden:28
    calculate:38 captivity:153 carefree:132 celebrity:8 chant:110 circular:120 clatter:80 coarse:120 collide:58 colossal:162 competition:18 compliment:142 consent:28 constant:58 construct:172 content:58 contract:18 contrast:182 contribute:38 convict:90 counsel:8 courtesy:133 crude:172
    decline:172 deliberate:142 demonstrate:8 dense:142 dependable:28 depress:182 despair:110 digest:48 disaster:70 discard:120 discipline:90 dismal:182 dismiss:18 dispose:182 distinct:172 distract:58 distress:100 dominant:143 drab:153 dread:38 drench:100 drought:58 drowsy:8 dungeon:90 dwell:100
    earnest:90 effective:162 elementary:70 elevate:110 employ:38 enclose:90 envy:70 epidemic:71 essential:8 establish:48 evident:173 exaggerate:183 extend:38 external:48 extraordinary:110 extreme:120
    fatal:153 feeble:71 focus:121 foul:58 frail:163 frantic:39
    gallant:80 generosity:153 genuine:153 gradual:91 grasp:121 grumble:91
    hardship:8 haste:49 haul:9 hazardous:143 heroic:111 hostage:163 huddle:143 humble:9 humid:49
    illegal:153 impulse:173 indicate:28 indifferent:183 initial:39 inspire:121 interpret:173
    jagged:91 jubilant:183 juvenile:100
    lance:111 landslide:163 lash:49 lukewarm:80
    magnify:121 manual:183 manufacture:133 marine:121 merit:153 missionary:111 mistrust:133
    necessity:143 neglect:19 noble:59 noticeable:133 nourish:91
    obtain:19 offend:143 oppose:49 orient:173 originate:183 outstanding:100 overthrow:133
    peculiar:133 penetrate:71 pioneer:49 pledge:9 plentiful:80 pointless:111 policy:59 portion:19 previous:29 proceed:101 provision:91
    quake:121 qualify:29 quiver:59
    rampage:163 ration:80 recall:19 recognition:183 reflect:111 regain:143 register:101 reserve:81 response:29 romp:71 routine:39
    scamper:163 scholar:81 sector:173 sensible:49 shabby:29 sift:101 sincere:9 site:111 slight:59 smolder:81 sponsor:19 spree:101 stampede:9 staple:71 stern:19 stun:39 sturdy:39 submit:173 suitable:9 survive:71 symptom:163
    tardy:101 thaw:29 thorough:143 tidy:59 toxic:111 treaty:91 tribute:183 troublesome:121 trudge:81
    uneasy:91 unfit:101 urgent:29
    vacant:19 vanity:29 variety:101 volunteer:81
    warrant:163 weary:81 worthy:49
    yield:39
    zest:173
  `, LEVEL_PAGES);

  const G5_PAGES = [6,16,26,36,46,56,68,78,88,98,108,118,130,140,150,160,170,180];
  const G5 = fromUnits(5, G5_PAGES, [
    ['blunder','cancel','continuous','distribute','document','fragile','myth','reject','scuffle','solitary','temporary','veteran'],
    ['abandon','assault','convert','dispute','impressive','justify','misleading','numerous','productive','shrewd','strategy','villain'],
    ['bluff','cautious','consist','despise','haven','miniature','monarch','obstacle','postpone','straggle','treacherous','vivid'],
    ['aggressive','associate','deceive','emigrate','flexible','glamour','hazy','linger','luxurious','mishap','overwhelm','span'],
    ['blemish','blunt','capable','conclude','detect','fatigue','festive','hospitality','nomad','persecute','supreme','transport'],
    ['accomplish','apparent','capacity','civilian','conceal','duplicate','keen','provoke','spurt','undoing','vast','withdraw'],
    ['barrier','calculate','compose','considerable','deputy','industrious','jolt','loot','rejoice','reliable','senseless','shrivel'],
    ['alternate','demolish','energetic','enforce','feat','hearty','mature','observant','primary','resign','strive','verdict'],
    ['brisk','cherish','considerate','displace','downfall','estimate','humiliate','identical','improper','poll','soothe','vicinity'],
    ['abolish','appeal','brittle','condemn','descend','dictator','expand','famine','portable','prey','thrifty','visual'],
    ['absurd','avalanche','classify','ensure','navigate','nestle','plea','principle','realistic','security','selective','tart'],
    ['abuse','appliance','confirm','daze','flimsy','gauge','migrant','neutral','pitiless','presentable','rotate','shred'],
    ['achievement','acquire','debate','exhibit','foe','latter','massacre','monotonous','preserve','sanitary','sprawl','widespread'],
    ['alibi','confederate','discharge','economical','frank','modify','mutiny','negative','pursue','reign','singular','swindle'],
    ['complicate','courteous','discomfort','eliminate','grieve','moral','scorch','severe','spectacle','tragic','trifle','universal'],
    ['assume','cram','endanger','fare','fertile','furnish','mammoth','peer','rigid','rowdy','safeguard','trespass'],
    ['accumulate','compromise','desolate','disregard','emphasis','friction','intervene','irresistible','majority','phenomenon','profound','subside'],
    ['advocate','anticipate','concept','contradict','extract','fundamental','ignorance','internal','preliminary','premise','retain','significant']
  ]);

  const words = [...G1, ...G2, ...G3, ...G4, ...G5]
    .sort((a, b) => a.grade - b.grade || a.unit - b.unit || a.word.localeCompare(b.word))
    .map(item => ({ ...item, id: `g${item.grade}-u${String(item.unit).padStart(2, '0')}-${item.word.replace(/[^a-z0-9]+/g, '-')}` }));

  const expected = { 1: 120, 2: 140, 3: 180, 4: 216, 5: 216 };
  Object.entries(expected).forEach(([grade, count]) => {
    const actual = words.filter(item => item.grade === Number(grade)).length;
    if (actual !== count) throw new Error(`G${grade} expected ${count} words, got ${actual}`);
  });
  if (new Set(words.map(item => item.id)).size !== words.length) throw new Error('Duplicate vocabulary IDs detected');

  return Object.freeze({ words: Object.freeze(words), expected: Object.freeze(expected), total: words.length });
});

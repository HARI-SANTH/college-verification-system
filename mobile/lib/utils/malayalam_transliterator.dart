/// Malayalam phonetic transliteration utility for common names and general phonetic words.
class MalayalamTransliterator {
  // Dictionary of frequent Kerala student names & surnames
  static final Map<String, String> _dictionary = {
    // First names
    'harisanth': 'ഹരിശാന്ത്',
    'haris': 'ഹാരിസ്',
    'hari': 'ഹരി',
    'rahul': 'രാഹുൽ',
    'ananya': 'അനന്യ',
    'joseph': 'ജോസഫ്',
    'akhil': 'അഖിൽ',
    'abhiram': 'അഭിറാം',
    'amal': 'അമൽ',
    'arun': 'അരുൺ',
    'athira': 'ആതിര',
    'sneha': 'സ്നേഹ',
    'anjali': 'അഞ്ജലി',
    'aswin': 'അശ്വിൻ',
    'midhun': 'മിഥുൻ',
    'karthik': 'കാർത്തിക്',
    'devika': 'ദേവിക',
    'deepak': 'ദീപക്',
    'gopika': 'ഗോപിക',
    'sreehari': 'ശ്രീഹരി',
    'abhishek': 'അഭിഷേക്',
    'vipin': 'വിപിൻ',
    'biju': 'ബിജു',
    'shaji': 'ഷാജി',
    'rajan': 'രാജൻ',
    'mohan': 'മോഹൻ',
    'gopal': 'ഗോപാൽ',
    'george': 'ജോർജ്',
    'thomas': 'തോമസ്',
    'mathew': 'മാത്യു',
    'jacob': 'ജേക്കബ്',
    'abraham': 'എബ്രഹാം',
    'paul': 'പോൾ',
    'peter': 'പീറ്റർ',
    'john': 'ജോൺ',
    'antony': 'ആന്റണി',
    'alex': 'അലക്സ്',
    'mani': 'മാണി',
    'chacko': 'ചാക്കോ',
    'baby': 'ബേബി',
    'roy': 'റോയ്',
    'sunny': 'സണ്ണി',
    'joy': 'ജോയ്',
    'benny': 'ബെന്നി',
    'babu': 'ബാബു',
    'jose': 'ജോസ്',
    'francis': 'ഫ്രാൻസിസ്',
    'cherian': 'ചെറിയാൻ',
    'philip': 'ഫിലിപ്പ്',
    'philipose': 'ഫിലിപ്പോസ്',
    'eapen': 'ഈപ്പൻ',
    'kochu': 'കൊച്ചു',
    'ali': 'അലി',
    'hassan': 'ഹസൻ',
    'hussain': 'ഹുസൈൻ',
    'ahmed': 'അഹമ്മദ്',
    'muhammed': 'മുഹമ്മദ്',
    'rafi': 'റഫി',
    'fathima': 'ഫാത്തിമ',
    'aisha': 'ആയിഷ',
    'rahman': 'റഹ്മാൻ',
    'vishnu': 'വിഷ്ണു',
    'nisha': 'നിഷ',
    'neethu': 'നീതു',
    'divya': 'ദിവ്യ',
    'remya': 'രമ്യ',
    'reshma': 'രേഷ്മ',
    'arya': 'ആര്യ',
    'lakshmi': 'ലക്ഷ്മി',
    'parvathi': 'പാർവ്വതി',
    'kavya': 'കാവ്യ',
    'meera': 'മീര',
    'sruthi': 'ശ്രുതി',
    'swathi': 'സ്വാതി',
    'aparna': 'അപർണ്ണ',
    'sandra': 'സാന്ദ്ര',
    'anjana': 'അഞ്ജന',
    'malavika': 'മാളവിക',
    'keerthi': 'കീർത്തി',
    'gayathri': 'ഗായത്രി',
    'archana': 'അർച്ചന',
    'greeshma': 'ഗ്രീഷ്മ',
    'haritha': 'ഹരിത',
    'vrindha': 'വൃന്ദ',
    'pooja': 'പൂജ',

    // Surnames / Initials / Communities
    's': 'എസ്',
    'k': 'കെ',
    'm': 'എം',
    'p': 'പി',
    'r': 'ആർ',
    'v': 'വി',
    'a': 'എ',
    'b': 'ബി',
    'c': 'സി',
    'd': 'ഡി',
    'e': 'ഇ',
    'f': 'എഫ്',
    'g': 'ജി',
    'h': 'എച്ച്',
    'j': 'ജെ',
    'l': 'എൽ',
    'n': 'എൻ',
    't': 'ടി',
    'u': 'യു',
    'nair': 'നായർ',
    'menon': 'മേനോൻ',
    'pillai': 'പിള്ള',
    'kumar': 'കുമാർ',
    'suresh': 'സുരേഷ്',
    'das': 'ദാസ്',
    'varma': 'വർമ്മ',
    'kurian': 'കുര്യൻ',
    'varghese': 'വർഗീസ്',
    'panicker': 'പണിക്കർ',
    'kurup': 'കുറുപ്പ്',
    'nambiar': 'നമ്പ്യാർ',
    'sharma': 'ശർമ്മ',
    'iyer': 'അയ്യർ',
    'koya': 'കോയ',
    'rawther': 'റാവുത്തർ',
  };

  /// Transliterates an English word/name to Malayalam.
  static String transliterate(String input) {
    final clean = input.trim();
    if (clean.isEmpty) return '';

    // 1. Direct dictionary match (case insensitive)
    final lower = clean.toLowerCase();
    if (_dictionary.containsKey(lower)) {
      return _dictionary[lower]!;
    }

    // 2. Handle multi-word strings (e.g. "Harisanth S" or "Joseph K")
    if (clean.contains(' ')) {
      final parts = clean.split(RegExp(r'\s+'));
      return parts.map(transliterate).join(' ');
    }

    // 3. Fallback: Phonetic algorithmic mapping
    return _phoneticTransliterate(lower);
  }

  static String _phoneticTransliterate(String input) {
    final buffer = StringBuffer();
    int i = 0;
    final len = input.length;

    while (i < len) {
      // Check 3-char matches
      if (i + 3 <= len) {
        final tri = input.substring(i, i + 3);
        if (tri == 'shr' || tri == 'sre') {
          buffer.write('ശ്രീ');
          i += 3;
          continue;
        }
        if (tri == 'nth') {
          buffer.write('ന്ത്');
          i += 3;
          continue;
        }
      }

      // Check 2-char matches
      if (i + 2 <= len) {
        final pair = input.substring(i, i + 2);
        switch (pair) {
          case 'th':
            buffer.write(i == len - 2 ? 'ത്' : 'ത');
            i += 2;
            continue;
          case 'sh':
            buffer.write('ശ');
            i += 2;
            continue;
          case 'ch':
            buffer.write('ച');
            i += 2;
            continue;
          case 'kh':
            buffer.write('ഖ');
            i += 2;
            continue;
          case 'gh':
            buffer.write('ഘ');
            i += 2;
            continue;
          case 'dh':
            buffer.write('ധ');
            i += 2;
            continue;
          case 'bh':
            buffer.write('ഭ');
            i += 2;
            continue;
          case 'ph':
            buffer.write('ഫ');
            i += 2;
            continue;
          case 'ee':
            buffer.write('ീ');
            i += 2;
            continue;
          case 'oo':
            buffer.write('ൂ');
            i += 2;
            continue;
          case 'ai':
            buffer.write('ൈ');
            i += 2;
            continue;
          case 'ou':
            buffer.write('ൗ');
            i += 2;
            continue;
          case 'aa':
            buffer.write(i == 0 ? 'ആ' : 'ാ');
            i += 2;
            continue;
        }
      }

      // Single characters
      final c = input[i];
      final isStart = i == 0;
      final isEnd = i == len - 1;

      switch (c) {
        case 'a':
          buffer.write(isStart ? 'അ' : 'ാ');
          break;
        case 'b':
          buffer.write('ബ');
          break;
        case 'c':
          buffer.write('സ');
          break;
        case 'd':
          buffer.write(isEnd ? 'ദ്' : 'ദ');
          break;
        case 'e':
          buffer.write(isStart ? 'എ' : 'െ');
          break;
        case 'f':
          buffer.write('ഫ');
          break;
        case 'g':
          buffer.write('ഗ');
          break;
        case 'h':
          buffer.write('ഹ');
          break;
        case 'i':
          buffer.write(isStart ? 'ഇ' : 'ി');
          break;
        case 'j':
          buffer.write('ജ');
          break;
        case 'k':
          buffer.write(isEnd ? 'ക്' : 'ക');
          break;
        case 'l':
          buffer.write(isEnd ? 'ൽ' : 'ല');
          break;
        case 'm':
          buffer.write(isEnd ? 'ം' : 'മ');
          break;
        case 'n':
          buffer.write(isEnd ? 'ൻ' : 'ന');
          break;
        case 'o':
          buffer.write(isStart ? 'ഒ' : 'ൊ');
          break;
        case 'p':
          buffer.write('പ');
          break;
        case 'q':
          buffer.write('ക്യൂ');
          break;
        case 'r':
          buffer.write(isEnd ? 'ർ' : 'ര');
          break;
        case 's':
          buffer.write(isEnd ? 'സ്' : 'സ');
          break;
        case 't':
          buffer.write(isEnd ? 'റ്റ്' : 'ട');
          break;
        case 'u':
          buffer.write(isStart ? 'ഉ' : 'ു');
          break;
        case 'v':
        case 'w':
          buffer.write('വ');
          break;
        case 'y':
          buffer.write('യ');
          break;
        case 'z':
          buffer.write('സ');
          break;
        default:
          buffer.write(c);
      }
      i++;
    }

    return buffer.toString();
  }
}

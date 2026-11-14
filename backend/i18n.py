"""Translations for the sentences the back end writes (English, German, Greek).

The language of the current request is kept in a context variable, so the wording functions in verbal.py
and satellite.py can call t("key", ...) without passing the language through every function.
"""
from __future__ import annotations

from contextvars import ContextVar

LANGS = ("en", "de", "el")
LANG: ContextVar[str] = ContextVar("lang", default="en")


def set_lang(lang: str) -> None:
    LANG.set(lang if lang in LANGS else "en")


def lang() -> str:
    return LANG.get()


def t(key: str, **kw) -> str:
    entry = S[key]
    text = entry.get(lang()) or entry["en"]
    return text.format(**kw) if kw else text


def cap(s: str) -> str:
    return s[:1].upper() + s[1:] if s else s


# --------------------------------------------------------------------------
# Crops
# --------------------------------------------------------------------------
CROPS = {
    "winter wheat": ("winter wheat", "Winterweizen", "χειμερινό σιτάρι"),
    "winter barley": ("winter barley", "Wintergerste", "χειμερινό κριθάρι"),
    "spring barley": ("spring barley", "Sommergerste", "ανοιξιάτικο κριθάρι"),
    "durum wheat": ("durum wheat", "Hartweizen", "σκληρό σιτάρι"),
    "sugar beet": ("sugar beet", "Zuckerrübe", "ζαχαρότευτλο"),
    "silage maize": ("silage maize", "Silomais", "καλαμπόκι για ενσίρωση"),
    "grain maize": ("grain maize", "Körnermais", "καλαμπόκι για καρπό"),
    "potato": ("potato", "Kartoffel", "πατάτα"),
    "winter rapeseed": ("winter rapeseed", "Winterraps", "χειμερινή ελαιοκράμβη"),
    "faba bean": ("faba bean", "Ackerbohne", "κουκί"),
    "field pea": ("field pea", "Körnererbse", "μπιζέλι"),
    "sunflower": ("sunflower", "Sonnenblume", "ηλίανθος"),
    "sorghum": ("sorghum", "Sorghum", "σόργο"),
    "chickpea": ("chickpea", "Kichererbse", "ρεβίθι"),
    "cotton": ("cotton", "Baumwolle", "βαμβάκι"),
    "mustard": ("mustard", "Senf", "σινάπι"),
    "oil radish": ("oil radish", "Ölrettich", "ελαιοδοτικό ραπάνι"),
    "phacelia": ("phacelia", "Phacelia", "φακέλια"),
    "crimson clover": ("crimson clover", "Inkarnatklee", "πορφυρό τριφύλλι"),
    "hairy vetch": ("hairy vetch", "Zottelwicke", "δασύτριχος βίκος"),
    "winter rye": ("winter rye", "Winterroggen", "χειμερινή σίκαλη"),
    "faba bean (winter-sown)": ("faba bean (winter-sown)", "Winterackerbohne", "κουκί (χειμερινής σποράς)"),
    "field pea (winter-sown)": ("field pea (winter-sown)", "Wintererbse", "μπιζέλι (χειμερινής σποράς)"),
    "barley-vetch mix (cover)": ("barley-vetch mix (cover)", "Gerste-Wicken-Gemenge (Zwischenfrucht)",
                                 "μείγμα κριθαριού-βίκου (κάλυψη)"),
}


# Greek object forms where they differ from the subject form ("grow sunflower" = "καλλιεργήστε ηλίανθο")
CROPS_ACC_EL = {"sunflower": "ηλίανθο", "hairy vetch": "δασύτριχο βίκο"}


def crop(name: str, language: str | None = None, accusative: bool = False) -> str:
    names = CROPS.get(name.lower())
    if not names:
        return name
    lg = language or lang()
    if lg == "el" and accusative and name.lower() in CROPS_ACC_EL:
        return CROPS_ACC_EL[name.lower()]
    return names[LANGS.index(lg)]


def crop_labels(name: str) -> dict[str, str]:
    return {lg: cap(crop(name, lg)) for lg in LANGS}


# --------------------------------------------------------------------------
# Months
# --------------------------------------------------------------------------
MONTHS = {
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
           "November", "December"],
    "de": ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober",
           "November", "Dezember"],
    "el": ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος",
           "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"],
}
# Greek needs the accusative after "τον" ("in August" = "τον Αύγουστο")
MONTHS_ACC_EL = ["Ιανουάριο", "Φεβρουάριο", "Μάρτιο", "Απρίλιο", "Μάιο", "Ιούνιο", "Ιούλιο", "Αύγουστο",
                 "Σεπτέμβριο", "Οκτώβριο", "Νοέμβριο", "Δεκέμβριο"]


def month(m: int, accusative: bool = False) -> str:
    if lang() == "el" and accusative:
        return MONTHS_ACC_EL[m - 1]
    return MONTHS[lang()][m - 1]


MONTHS_SHORT = {"de": ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
                "el": ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μάι", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"]}
MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def localise_period(text: str) -> str:
    """'Nov 1986–Oct 2006' -> 'Nov 1986–Okt 2006' in German."""
    if lang() == "en":
        return text
    import re
    return re.sub(r"\b(" + "|".join(MONTHS_SHORT_EN) + r")\b",
                  lambda m: MONTHS_SHORT[lang()][MONTHS_SHORT_EN.index(m.group(1))], text)


RANGE_WORDS = {"en": (" and ", " to ", "all year"), "de": (" und ", " bis ", "das ganze Jahr"),
               "el": (" και ", " έως ", "όλο τον χρόνο")}


# --------------------------------------------------------------------------
# Sentences: {"key": {"en": ..., "de": ..., "el": ...}}
# --------------------------------------------------------------------------
S: dict[str, dict[str, str]] = {
    # how often (out of 20 years)
    "f_rarely": {"en": "rarely", "de": "selten", "el": "σπάνια"},
    "f_now_then": {"en": "now and then", "de": "ab und zu", "el": "πού και πού"},
    "f_one_in_four": {"en": "about one year in four", "de": "etwa jedes vierte Jahr",
                      "el": "περίπου μία χρονιά στις τέσσερις"},
    "f_one_in_three": {"en": "about one year in three", "de": "etwa jedes dritte Jahr",
                       "el": "περίπου μία χρονιά στις τρεις"},
    "f_every_other": {"en": "about every other year", "de": "etwa jedes zweite Jahr",
                      "el": "περίπου κάθε δεύτερη χρονιά"},
    "f_most_years": {"en": "in most years", "de": "in den meisten Jahren", "el": "τις περισσότερες χρονιές"},
    "f_almost_every": {"en": "almost every year", "de": "fast jedes Jahr", "el": "σχεδόν κάθε χρονιά"},

    # share of rain (sentence start, capitalised)
    "sh_very_little": {"en": "Very little", "de": "Sehr wenig", "el": "Πολύ λίγη"},
    "sh_small": {"en": "A small part", "de": "Ein kleiner Teil", "el": "Ένα μικρό μέρος"},
    "sh_quarter": {"en": "About a quarter", "de": "Etwa ein Viertel", "el": "Περίπου το ένα τέταρτο"},
    "sh_third": {"en": "About a third", "de": "Etwa ein Drittel", "el": "Περίπου το ένα τρίτο"},
    "sh_half": {"en": "About half", "de": "Etwa die Hälfte", "el": "Περίπου η μισή"},
    "sh_most": {"en": "Most", "de": "Der größte Teil", "el": "Το μεγαλύτερο μέρος"},

    # how long the soil is covered
    "cv_almost_all": {"en": "almost all year", "de": "fast das ganze Jahr", "el": "σχεδόν όλο τον χρόνο"},
    "cv_most": {"en": "most of the year", "de": "den größten Teil des Jahres",
                "el": "το μεγαλύτερο μέρος του χρόνου"},
    "cv_two_thirds": {"en": "about two thirds of the year", "de": "etwa zwei Drittel des Jahres",
                      "el": "περίπου τα δύο τρίτα του χρόνου"},
    "cv_half": {"en": "about half the year", "de": "etwa das halbe Jahr", "el": "περίπου τον μισό χρόνο"},
    "cv_less_half": {"en": "less than half the year", "de": "weniger als das halbe Jahr",
                     "el": "λιγότερο από τον μισό χρόνο"},

    # weather changes
    "w_warm": {"en": "Warm days (25 °C and above)", "de": "Warme Tage (ab 25 °C)",
               "el": "Ζεστές μέρες (25 °C και πάνω)"},
    "w_hot": {"en": "Hot days (30 °C and above)", "de": "Heiße Tage (ab 30 °C)",
              "el": "Καυτές μέρες (30 °C και πάνω)"},
    "w_frost": {"en": "Frost days", "de": "Frosttage", "el": "Μέρες παγετού"},
    "w_heavy": {"en": "Heavy downpours", "de": "Starkregen", "el": "Έντονες νεροποντές"},
    "w_dry": {"en": "Dry spells in the growing season", "de": "Trockenperioden in der Wachstumszeit",
              "el": "Ξηρές περίοδοι στην καλλιεργητική περίοδο"},
    "w_rain": {"en": "Yearly rain", "de": "Jahresniederschlag", "el": "Ετήσια βροχή"},
    "t_more": {"en": "more common", "de": "häufiger", "el": "πιο συχνές"},
    "t_much_more": {"en": "much more common", "de": "viel häufiger", "el": "πολύ πιο συχνές"},
    "t_less": {"en": "less common", "de": "seltener", "el": "λιγότερο συχνές"},
    "t_much_less": {"en": "much less common", "de": "viel seltener", "el": "πολύ λιγότερο συχνές"},
    "t_same": {"en": "about as common as before", "de": "etwa so häufig wie früher",
               "el": "περίπου όσο συχνές και πριν"},
    "t_higher": {"en": "higher", "de": "höher", "el": "περισσότερη"},
    "t_lower": {"en": "lower", "de": "niedriger", "el": "λιγότερη"},
    "t_same_amount": {"en": "about the same as before", "de": "etwa gleich wie früher",
                      "el": "περίπου ίδια με πριν"},
    "weather_line": {"en": "{label}: {text}.", "de": "{label}: {text}.", "el": "{label}: {text}."},
    "period": {"en": "{then} compared with {now}", "de": "{then} im Vergleich zu {now}",
               "el": "{then} σε σύγκριση με {now}"},

    # water
    "water_ok": {"en": "Rain covers what your crops need in most years.",
                 "de": "In den meisten Jahren deckt der Regen, was Ihre Kulturen brauchen.",
                 "el": "Τις περισσότερες χρονιές η βροχή καλύπτει όσο νερό χρειάζονται οι καλλιέργειές σας."},
    "water_some": {"en": "In summer your crops sometimes need more water than the rain gives.",
                   "de": "Im Sommer brauchen Ihre Kulturen manchmal mehr Wasser, als der Regen liefert.",
                   "el": "Το καλοκαίρι οι καλλιέργειές σας μερικές φορές χρειάζονται περισσότερο νερό "
                         "από όσο δίνει η βροχή."},
    "water_often": {"en": "In summer your crops regularly need more water than the rain gives.",
                    "de": "Im Sommer brauchen Ihre Kulturen regelmäßig mehr Wasser, als der Regen liefert.",
                    "el": "Το καλοκαίρι οι καλλιέργειές σας συχνά χρειάζονται περισσότερο νερό από όσο δίνει "
                          "η βροχή."},
    "water_irrigate": {"en": " You can irrigate, so this mainly affects your water use and costs.",
                       "de": " Sie können bewässern, daher betrifft das vor allem Ihren Wasserverbrauch und Ihre "
                             "Kosten.",
                       "el": " Μπορείτε να ποτίσετε, οπότε αυτό επηρεάζει κυρίως την κατανάλωση νερού και το "
                             "κόστος σας."},

    # soil (slide 1)
    "soil_bare": {"en": "In your rotation the soil is bare in {ranges} in at least one year.",
                  "de": "In Ihrer Fruchtfolge liegt der Boden in mindestens einem Jahr kahl: {ranges}.",
                  "el": "Στην αμειψισπορά σας το έδαφος μένει γυμνό τουλάχιστον μία χρονιά: {ranges}."},
    "soil_all_covered": {"en": "Your soil is covered all year.", "de": "Ihr Boden ist das ganze Jahr bedeckt.",
                         "el": "Το έδαφός σας είναι καλυμμένο όλο τον χρόνο."},
    "soil_covered": {"en": "Something is growing on your field {cover}.",
                     "de": "Auf Ihrem Feld wächst {cover} etwas.",
                     "el": "Στο χωράφι σας κάτι μεγαλώνει {cover}."},
    "soil_rain": {"en": "{share} of the year's rain falls while the soil is bare.",
                  "de": "{share} des Jahresregens fällt, während der Boden kahl ist.",
                  "el": "{share} της ετήσιας βροχής πέφτει όταν το έδαφος είναι γυμνό."},

    # warnings
    "in_when": {"en": "in {when} ", "de": "({when}) ", "el": "({when}) "},
    "warn_heavy": {"en": "Heavy rain falls on bare soil {freq}, {tail}.",
                   "de": "Starkregen trifft {freq} auf kahlen Boden, {tail}.",
                   "el": "Έντονη βροχή πέφτει σε γυμνό έδαφος {freq}, {tail}."},
    "tail_default": {"en": "which can wash soil away", "de": "dabei kann Boden abgeschwemmt werden",
                     "el": "και μπορεί να παρασύρει χώμα"},
    "tail_flat": {"en": "but your field is flat, so little soil is washed away",
                  "de": "aber Ihr Feld ist eben, daher wird wenig Boden abgeschwemmt",
                  "el": "αλλά το χωράφι σας είναι επίπεδο, οπότε παρασύρεται λίγο χώμα"},
    "tail_steep": {"en": "and much of your field is on a slope, so soil washes away easily",
                   "de": "und ein großer Teil Ihres Feldes liegt am Hang, daher wird Boden leicht abgeschwemmt",
                   "el": "και μεγάλο μέρος του χωραφιού σας είναι σε κλίση, οπότε το χώμα παρασύρεται εύκολα"},
    "warn_heat": {"en": "{crop}: heat stress {when}{freq}.", "de": "{crop}: Hitzestress {when}{freq}.",
                  "el": "{crop}: θερμικό στρες {when}{freq}."},
    "warn_frost": {"en": "{crop}: damaging frost after sowing {freq}.",
                   "de": "{crop}: schädlicher Frost nach der Aussaat {freq}.",
                   "el": "{crop}: επιζήμιος παγετός μετά τη σπορά {freq}."},
    "warn_dry": {"en": "{crop}: two weeks or more without rain {when}{freq}.",
                 "de": "{crop}: zwei Wochen oder länger ohne Regen {when}{freq}.",
                 "el": "{crop}: δύο εβδομάδες ή περισσότερο χωρίς βροχή {when}{freq}."},

    # what gets better / worse
    "b_cover_much": {"en": "Your soil is protected for much longer each year.",
                     "de": "Ihr Boden ist jedes Jahr deutlich länger geschützt.",
                     "el": "Το έδαφός σας προστατεύεται πολύ περισσότερο κάθε χρόνο."},
    "b_cover": {"en": "Your soil is protected a little longer each year.",
                "de": "Ihr Boden ist jedes Jahr etwas länger geschützt.",
                "el": "Το έδαφός σας προστατεύεται λίγο περισσότερο κάθε χρόνο."},
    "w_cover_worse": {"en": "Trade-off: your soil is bare for longer each year.",
                      "de": "Nachteil: Ihr Boden liegt jedes Jahr länger kahl.",
                      "el": "Μειονέκτημα: το έδαφός σας μένει γυμνό περισσότερο κάθε χρόνο."},
    "b_rain_much": {"en": "Much less rain falls on bare soil, so less soil is washed away.",
                    "de": "Viel weniger Regen fällt auf kahlen Boden, daher wird weniger Boden abgeschwemmt.",
                    "el": "Πολύ λιγότερη βροχή πέφτει σε γυμνό έδαφος, οπότε παρασύρεται λιγότερο χώμα."},
    "b_rain": {"en": "Less rain falls on bare soil.", "de": "Weniger Regen fällt auf kahlen Boden.",
               "el": "Λιγότερη βροχή πέφτει σε γυμνό έδαφος."},
    "w_rain_worse": {"en": "Trade-off: more rain falls on bare soil.",
                     "de": "Nachteil: mehr Regen fällt auf kahlen Boden.",
                     "el": "Μειονέκτημα: περισσότερη βροχή πέφτει σε γυμνό έδαφος."},
    "b_water_much": {"en": "Your crops need much less extra water.",
                     "de": "Ihre Kulturen brauchen viel weniger zusätzliches Wasser.",
                     "el": "Οι καλλιέργειές σας χρειάζονται πολύ λιγότερο επιπλέον νερό."},
    "b_water": {"en": "Your crops need a little less extra water.",
                "de": "Ihre Kulturen brauchen etwas weniger zusätzliches Wasser.",
                "el": "Οι καλλιέργειές σας χρειάζονται λίγο λιγότερο επιπλέον νερό."},
    "w_water_worse": {"en": "Trade-off: your crops need more extra water.",
                      "de": "Nachteil: Ihre Kulturen brauchen mehr zusätzliches Wasser.",
                      "el": "Μειονέκτημα: οι καλλιέργειές σας χρειάζονται περισσότερο επιπλέον νερό."},
    "b_nitrogen": {"en": "A legume adds nitrogen, so the next crop needs less fertiliser.",
                   "de": "Eine Leguminose bindet Stickstoff, die Folgekultur braucht weniger Dünger.",
                   "el": "Ένα ψυχανθές προσθέτει άζωτο, οπότε η επόμενη καλλιέργεια χρειάζεται λιγότερο λίπασμα."},
    "b_pests": {"en": "Crop families alternate, which helps break pest and disease cycles.",
                "de": "Die Pflanzenfamilien wechseln sich ab, das unterbricht Schädlings- und Krankheitszyklen.",
                "el": "Οι οικογένειες φυτών εναλλάσσονται, κάτι που σπάει τους κύκλους εχθρών και ασθενειών."},
    "b_fewer_warn": {"en": "Fewer weather warnings than your current rotation.",
                     "de": "Weniger Wetterwarnungen als Ihre jetzige Fruchtfolge.",
                     "el": "Λιγότερες προειδοποιήσεις καιρού από την τωρινή σας αμειψισπορά."},

    # options that are not available
    "na_fits": {"en": "Your rotation already fits the rain here, so there is no need to change crops to save water.",
                "de": "Ihre Fruchtfolge passt bereits zum Regen hier, ein Kulturwechsel zum Wassersparen ist nicht "
                      "nötig.",
                "el": "Η αμειψισπορά σας ταιριάζει ήδη με τη βροχή της περιοχής, οπότε δεν χρειάζεται αλλαγή "
                      "καλλιεργειών για εξοικονόμηση νερού."},
    "na_cover": {"en": "No cover crop fits the gap in your rotation: the gap is too short, too cold or too dry.",
                 "de": "Keine Zwischenfrucht passt in die Lücke Ihrer Fruchtfolge: Sie ist zu kurz, zu kalt oder zu "
                       "trocken.",
                 "el": "Καμία καλλιέργεια κάλυψης δεν χωράει στο κενό της αμειψισποράς σας: είναι πολύ σύντομο, "
                       "πολύ κρύο ή πολύ ξηρό."},
    "na_water": {"en": "No crop that needs less water fits the same season on this field.",
                 "de": "Keine Kultur mit weniger Wasserbedarf passt in dieselbe Saison auf diesem Feld.",
                 "el": "Καμία καλλιέργεια με μικρότερες ανάγκες σε νερό δεν ταιριάζει στην ίδια περίοδο σε αυτό το "
                       "χωράφι."},
    "na_other": {"en": "This option is not available for your field.",
                 "de": "Diese Option ist für Ihr Feld nicht verfügbar.",
                 "el": "Αυτή η επιλογή δεν είναι διαθέσιμη για το χωράφι σας."},

    # decisions and their notes
    "keep": {"en": "Keep your current rotation.", "de": "Behalten Sie Ihre jetzige Fruchtfolge.",
             "el": "Κρατήστε την τωρινή σας αμειψισπορά."},
    "sow_cover": {"en": "Sow {cover} in {m1} and end it in {m2}{before}.",
                  "de": "Säen Sie {cover} im {m1} und beenden Sie die Zwischenfrucht im {m2}{before}.",
                  "el": "Σπείρτε {cover} τον {m1} και τερματίστε την τον {m2}{before}."},
    "before_next": {"en": ", before the {next} is sown", "de": ", bevor {next} gesät wird",
                    "el": ", πριν σπαρθεί {next}"},
    "add_cover": {"en": "Add {cover} as a cover crop in the gap where your soil is bare.",
                  "de": "{cover} als Zwischenfrucht in die Lücke säen, in der Ihr Boden kahl liegt.",
                  "el": "Προσθέστε {cover} ως καλλιέργεια κάλυψης στο κενό όπου το έδαφος μένει γυμνό."},
    "cover_cost": {"en": "A cover crop costs seed and work, and uses some water before the next crop.",
                   "de": "Eine Zwischenfrucht kostet Saatgut und Arbeit und verbraucht vor der Folgekultur etwas "
                         "Wasser.",
                   "el": "Μια καλλιέργεια κάλυψης κοστίζει σε σπόρο και εργασία και καταναλώνει λίγο νερό πριν από "
                         "την επόμενη καλλιέργεια."},
    "grow_instead": {"en": "Grow {new} instead of {old}.", "de": "Bauen Sie {new} statt {old} an.",
                     "el": "Καλλιεργήστε {new} αντί για {old}."},
    "replace": {"en": "Replace {old} with {new}, which needs less water in the same season.",
                "de": "{old} durch {new} ersetzen, die in derselben Saison weniger Wasser braucht.",
                "el": "Αντικαταστήστε {old} με {new}, που χρειάζεται λιγότερο νερό την ίδια περίοδο."},
    "market": {"en": "Market, price and machinery for {new} are not checked.",
               "de": "Markt, Preis und Maschinen für {new} sind nicht geprüft.",
               "el": "Η αγορά, η τιμή και τα μηχανήματα για {new} δεν έχουν ελεγχθεί."},

    # questions for the advisor
    "q_risks_seen": {"en": "Which of these risks have you seen on this field?",
                     "de": "Welche dieser Risiken haben Sie auf diesem Feld schon erlebt?",
                     "el": "Ποιους από αυτούς τους κινδύνους έχετε δει σε αυτό το χωράφι;"},
    "q_cover_suits": {"en": "Does {c} suit the crop that follows it (pests, nematodes, residue)?",
                      "de": "Passt {c} zur Folgekultur (Schädlinge, Nematoden, Rückstände)?",
                      "el": "Ταιριάζει {c} με την καλλιέργεια που ακολουθεί (εχθροί, νηματώδεις, υπολείμματα);"},
    "q_cover_mix": {"en": "Which variety or mix, and which sowing and termination dates?",
                    "de": "Welche Sorte oder Mischung, und welche Saat- und Umbruchtermine?",
                    "el": "Ποια ποικιλία ή μείγμα, και ποιες ημερομηνίες σποράς και τερματισμού;"},
    "q_cover_subsidy": {"en": "Does this cover crop count toward your subsidy requirements?",
                        "de": "Zählt diese Zwischenfrucht für Ihre Förderauflagen?",
                        "el": "Μετράει αυτή η καλλιέργεια κάλυψης για τις απαιτήσεις των επιδοτήσεών σας;"},
    "q_legume_rules": {"en": "Are legume cover crops allowed on this field under local water-protection rules?",
                       "de": "Sind Leguminosen als Zwischenfrucht auf diesem Feld nach den örtlichen "
                             "Wasserschutzregeln erlaubt?",
                       "el": "Επιτρέπονται ψυχανθή ως καλλιέργειες κάλυψης σε αυτό το χωράφι, σύμφωνα με τους "
                             "τοπικούς κανόνες προστασίας υδάτων;"},
    "q_nematode": {"en": "Before sugar beet, use a nematode-resistant variety. Which one suits this field?",
                   "de": "Vor Zuckerrüben eine nematodenresistente Sorte nutzen. Welche passt zu diesem Feld?",
                   "el": "Πριν από ζαχαρότευτλα, χρησιμοποιήστε ποικιλία ανθεκτική στους νηματώδεις. Ποια ταιριάζει "
                         "σε αυτό το χωράφι;"},
    "q_buyer": {"en": "Is there a buyer for {c} nearby, and at what price?",
                "de": "Gibt es in der Nähe einen Abnehmer für {c}, und zu welchem Preis?",
                "el": "Υπάρχει αγοραστής για {c} κοντά σας, και σε ποια τιμή;"},
    "q_machinery": {"en": "Do you have the machinery, or can a contractor do it?",
                    "de": "Haben Sie die Maschinen, oder kann ein Lohnunternehmer das übernehmen?",
                    "el": "Έχετε τα μηχανήματα ή μπορεί να το αναλάβει εργολάβος;"},
    "q_variety": {"en": "Which {c} variety suits this field?", "de": "Welche Sorte {c} passt zu diesem Feld?",
                  "el": "Ποια ποικιλία ταιριάζει σε αυτό το χωράφι ({c});"},

    # summary
    "p_save_water": {"en": "saving water", "de": "Wassersparen", "el": "η εξοικονόμηση νερού"},
    "p_build_soil": {"en": "building healthier soil", "de": "ein gesünderer Boden", "el": "ένα πιο υγιές έδαφος"},
    "p_income_forage": {"en": "earning more or feeding animals", "de": "mehr Einkommen oder Futter",
                        "el": "περισσότερο εισόδημα ή ζωοτροφή"},
    "n_current": {"en": "current rotation", "de": "jetzige Fruchtfolge", "el": "τωρινή αμειψισπορά"},
    "n_soil_building": {"en": "soil-building rotation", "de": "bodenaufbauende Fruchtfolge",
                        "el": "αμειψισπορά για υγιές έδαφος"},
    "n_water_saving": {"en": "water-saving rotation", "de": "wassersparende Fruchtfolge",
                       "el": "αμειψισπορά εξοικονόμησης νερού"},
    "sum_none": {"en": "No rotation could be compared for this field.",
                 "de": "Für dieses Feld konnte keine Fruchtfolge verglichen werden.",
                 "el": "Δεν ήταν δυνατή η σύγκριση αμειψισπορών για αυτό το χωράφι."},
    "sum_current": {"en": "For {prio}, your current rotation is already the best of the three. "
                          "Check the warnings below with your advisor.",
                    "de": "Wenn Ihnen {prio} am wichtigsten ist, ist Ihre jetzige Fruchtfolge bereits die beste der "
                          "drei. Besprechen Sie die Warnungen unten mit Ihrer Beratung.",
                    "el": "Αν σας ενδιαφέρει περισσότερο {prio}, η τωρινή σας αμειψισπορά είναι ήδη η καλύτερη από "
                          "τις τρεις. Συζητήστε τις παρακάτω προειδοποιήσεις με τον σύμβουλό σας."},
    "sum_best": {"en": "For {prio}, the best option is the {name}: {decision}",
                 "de": "Wenn Ihnen {prio} am wichtigsten ist, ist die {name} die beste Option: {decision}",
                 "el": "Αν σας ενδιαφέρει περισσότερο {prio}, η καλύτερη επιλογή είναι η {name}: {decision}"},

    # sources
    "src_weather": {"en": "Weather: NASA POWER, for your wider area (about 50 km).",
                    "de": "Wetter: NASA POWER, für Ihre weitere Umgebung (etwa 50 km).",
                    "el": "Καιρός: NASA POWER, για την ευρύτερη περιοχή σας (περίπου 50 km)."},
    "src_bare_sat": {"en": "Bare months: satellite images of your field (Landsat and Sentinel-2).",
                     "de": "Kahle Monate: Satellitenbilder Ihres Feldes (Landsat und Sentinel-2).",
                     "el": "Γυμνοί μήνες: δορυφορικές εικόνες του χωραφιού σας (Landsat και Sentinel-2)."},
    "src_bare_farmer": {"en": "Bare months: the sowing and harvest months you entered.",
                        "de": "Kahle Monate: die von Ihnen eingegebenen Saat- und Erntemonate.",
                        "el": "Γυμνοί μήνες: οι μήνες σποράς και συγκομιδής που δηλώσατε."},
    "src_bare_checked": {"en": "Bare months: satellite images of your field (NASA HLS, Landsat and Sentinel-2), "
                               "checked with your crop months.",
                         "de": "Kahle Monate: Satellitenbilder Ihres Feldes (NASA HLS, Landsat und Sentinel-2), "
                               "abgeglichen mit Ihren Anbaumonaten.",
                         "el": "Γυμνοί μήνες: δορυφορικές εικόνες του χωραφιού σας (NASA HLS, Landsat και "
                               "Sentinel-2), σε σύγκριση με τους μήνες καλλιέργειας που δηλώσατε."},
    "src_slope": {"en": "Slope: NASA elevation data (NASADEM / SRTM, 30 m).",
                  "de": "Hangneigung: NASA-Höhendaten (NASADEM / SRTM, 30 m).",
                  "el": "Κλίση: δεδομένα υψομέτρου της NASA (NASADEM / SRTM, 30 m)."},

    # satellite
    "sat_match": {"en": "Satellite images of your field match the crop months you entered.",
                  "de": "Die Satellitenbilder Ihres Feldes passen zu den eingegebenen Anbaumonaten.",
                  "el": "Οι δορυφορικές εικόνες του χωραφιού σας συμφωνούν με τους μήνες καλλιέργειας που "
                        "δηλώσατε."},
    "sat_mostly": {"en": "Satellite images mostly match the crop months you entered; the months that differ are "
                         "marked.",
                   "de": "Die Satellitenbilder passen größtenteils zu Ihren Anbaumonaten; abweichende Monate sind "
                         "markiert.",
                   "el": "Οι δορυφορικές εικόνες συμφωνούν κυρίως με τους μήνες που δηλώσατε· οι μήνες που "
                         "διαφέρουν είναι σημειωμένοι."},
    "sat_differ": {"en": "Satellite images often differ from the crop months you entered. Check the months marked, "
                         "or whether the crops are in the right order.",
                   "de": "Die Satellitenbilder weichen oft von Ihren Anbaumonaten ab. Prüfen Sie die markierten "
                         "Monate oder die Reihenfolge der Kulturen.",
                   "el": "Οι δορυφορικές εικόνες συχνά διαφέρουν από τους μήνες που δηλώσατε. Ελέγξτε τους "
                         "σημειωμένους μήνες ή τη σειρά των καλλιεργειών."},
    "sat_clouds": {"en": "Clouds hid your field in {ranges} in some years; those months use the crop months you "
                         "entered.",
                   "de": "In manchen Jahren verdeckten Wolken Ihr Feld ({ranges}); für diese Monate gelten Ihre "
                         "Anbaumonate.",
                   "el": "Κάποιες χρονιές τα σύννεφα έκρυβαν το χωράφι σας ({ranges})· για αυτούς τους μήνες "
                         "χρησιμοποιούνται οι μήνες που δηλώσατε."},
    "sat_out_one": {"en": "The satellite record does not cover year {y} of your rotation, so that year uses the "
                          "crop months you entered.",
                    "de": "Die Satellitendaten decken Jahr {y} Ihrer Fruchtfolge nicht ab; dort gelten Ihre "
                          "Anbaumonate.",
                    "el": "Τα δορυφορικά δεδομένα δεν καλύπτουν το έτος {y} της αμειψισποράς σας· εκεί "
                          "χρησιμοποιούνται οι μήνες που δηλώσατε."},
    "sat_out_many": {"en": "The satellite record does not cover years {ys} and {y} of your rotation, so those years "
                           "use the crop months you entered.",
                     "de": "Die Satellitendaten decken die Jahre {ys} und {y} Ihrer Fruchtfolge nicht ab; dort "
                           "gelten Ihre Anbaumonate.",
                     "el": "Τα δορυφορικά δεδομένα δεν καλύπτουν τα έτη {ys} και {y} της αμειψισποράς σας· εκεί "
                           "χρησιμοποιούνται οι μήνες που δηλώσατε."},

    # slope
    "slope_flat": {"en": "Your field is almost flat, so rain washes little soil away even when it is bare.",
                   "de": "Ihr Feld ist fast eben, daher schwemmt Regen selbst bei kahlem Boden wenig Erde ab.",
                   "el": "Το χωράφι σας είναι σχεδόν επίπεδο, οπότε η βροχή παρασύρει λίγο χώμα ακόμη κι όταν "
                         "είναι γυμνό."},
    "slope_much": {"en": "Much of your field is on a slope. Bare soil there washes away quickly in heavy rain.",
                   "de": "Ein großer Teil Ihres Feldes liegt am Hang. Kahler Boden wird dort bei Starkregen schnell "
                         "abgeschwemmt.",
                   "el": "Μεγάλο μέρος του χωραφιού σας είναι σε κλίση. Εκεί το γυμνό έδαφος παρασύρεται γρήγορα "
                         "σε έντονη βροχή."},
    "slope_part": {"en": "Part of your field is on a slope. Bare soil there washes away faster in heavy rain.",
                   "de": "Ein Teil Ihres Feldes liegt am Hang. Kahler Boden wird dort bei Starkregen schneller "
                         "abgeschwemmt.",
                   "el": "Μέρος του χωραφιού σας είναι σε κλίση. Εκεί το γυμνό έδαφος παρασύρεται πιο γρήγορα σε "
                         "έντονη βροχή."},
    "slope_gentle": {"en": "Your field slopes gently. Bare soil can wash away in heavy rain.",
                     "de": "Ihr Feld ist leicht geneigt. Kahler Boden kann bei Starkregen abgeschwemmt werden.",
                     "el": "Το χωράφι σας έχει ήπια κλίση. Το γυμνό έδαφος μπορεί να παρασυρθεί σε έντονη βροχή."},

    # API messages
    "note_fallback": {"en": "NASA POWER could not be reached ({err}); saved demo weather from {name} is shown instead.",
                      "de": "NASA POWER war nicht erreichbar ({err}); stattdessen werden gespeicherte Demo-Wetterdaten "
                            "({name}) gezeigt.",
                      "el": "Η υπηρεσία NASA POWER δεν ήταν διαθέσιμη ({err})· εμφανίζονται αποθηκευμένα δεδομένα "
                            "καιρού επίδειξης ({name})."},
    "e_weather": {"en": "The weather service could not be reached. Try again in a minute.",
                  "de": "Der Wetterdienst war nicht erreichbar. Versuchen Sie es in einer Minute erneut.",
                  "el": "Η υπηρεσία καιρού δεν ήταν διαθέσιμη. Δοκιμάστε ξανά σε ένα λεπτό."},
    "e_read": {"en": "The field outline could not be read. Draw it again.",
               "de": "Der Feldumriss konnte nicht gelesen werden. Zeichnen Sie ihn neu.",
               "el": "Δεν ήταν δυνατή η ανάγνωση του περιγράμματος. Σχεδιάστε το ξανά."},
    "e_cross": {"en": "The field outline crosses itself. Draw it again, corner by corner.",
                "de": "Der Feldumriss überschneidet sich. Zeichnen Sie ihn Ecke für Ecke neu.",
                "el": "Το περίγραμμα τέμνει τον εαυτό του. Σχεδιάστε το ξανά, γωνία-γωνία."},
    "e_small": {"en": "The field is smaller than 1 hectare. Draw a larger area.",
                "de": "Das Feld ist kleiner als 1 Hektar. Zeichnen Sie eine größere Fläche.",
                "el": "Το χωράφι είναι μικρότερο από 1 εκτάριο. Σχεδιάστε μεγαλύτερη έκταση."},
    "e_large": {"en": "The field is larger than 500 hectares. Draw a single field.",
                "de": "Das Feld ist größer als 500 Hektar. Zeichnen Sie ein einzelnes Feld.",
                "el": "Το χωράφι είναι μεγαλύτερο από 500 εκτάρια. Σχεδιάστε ένα μόνο χωράφι."},
    "e_crop": {"en": "Unknown crop: {names}.", "de": "Unbekannte Kultur: {names}.",
               "el": "Άγνωστη καλλιέργεια: {names}."},
}

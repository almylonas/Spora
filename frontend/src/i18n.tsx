import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "de" | "el";
export const LANGS: { id: Lang; short: string; name: string }[] = [
  { id: "en", short: "EN", name: "English" },
  { id: "de", short: "DE", name: "Deutsch" },
  { id: "el", short: "ΕΛ", name: "Ελληνικά" },
];

type Entry = Record<Lang, string>;

/* All interface text. {name} placeholders are filled by t(key, { name: value }). */
const S = {
  // ---- general
  disclaimer: { en: "Spora supports your judgement. It does not replace local advice.", de: "Spora unterstützt Ihr Urteil. Es ersetzt keine Beratung vor Ort.", el: "Το Spora στηρίζει την κρίση σας. Δεν αντικαθιστά την τοπική συμβουλή." },
  language: { en: "Language", de: "Sprache", el: "Γλώσσα" },
  crops_load_error: { en: "The crop list could not be loaded. Reload the page.", de: "Die Kulturliste konnte nicht geladen werden. Laden Sie die Seite neu.", el: "Η λίστα καλλιεργειών δεν φόρτωσε. Ανανεώστε τη σελίδα." },
  analysis_failed: { en: "The analysis failed. Try again.", de: "Die Analyse ist fehlgeschlagen. Versuchen Sie es erneut.", el: "Η ανάλυση απέτυχε. Δοκιμάστε ξανά." },
  server_error: { en: "Something went wrong on the server. Try again.", de: "Auf dem Server ist ein Fehler aufgetreten. Versuchen Sie es erneut.", el: "Κάτι πήγε στραβά στον διακομιστή. Δοκιμάστε ξανά." },
  missing_answers: { en: "Some answers are missing. Check the form and try again.", de: "Einige Angaben fehlen. Prüfen Sie das Formular und versuchen Sie es erneut.", el: "Λείπουν κάποιες απαντήσεις. Ελέγξτε τη φόρμα και δοκιμάστε ξανά." },

  // ---- map
  home: { en: "Spora, back to the start page", de: "Spora, zurück zur Startseite", el: "Spora, επιστροφή στην αρχική σελίδα" },
  map_tools: { en: "Map tools", de: "Kartenwerkzeuge", el: "Εργαλεία χάρτη" },
  draw: { en: "Draw your field", de: "Feld einzeichnen", el: "Σχεδιάστε το χωράφι σας" },
  stop_draw: { en: "Stop drawing", de: "Zeichnen beenden", el: "Διακοπή σχεδίασης" },
  edit: { en: "Edit outline", de: "Umriss bearbeiten", el: "Επεξεργασία περιγράμματος" },
  finish_edit: { en: "Finish editing", de: "Bearbeitung beenden", el: "Τέλος επεξεργασίας" },
  delete: { en: "Delete outline", de: "Umriss löschen", el: "Διαγραφή περιγράμματος" },
  zoom_field: { en: "Zoom to my field", de: "Zu meinem Feld", el: "Μετάβαση στο χωράφι μου" },
  locate: { en: "Go to my location", de: "Zu meinem Standort", el: "Μετάβαση στη θέση μου" },
  locating: { en: "Finding you…", de: "Standort wird gesucht…", el: "Εντοπισμός θέσης…" },
  road_map: { en: "Show road map", de: "Straßenkarte zeigen", el: "Εμφάνιση οδικού χάρτη" },
  sat_view: { en: "Show satellite view", de: "Satellitenbild zeigen", el: "Εμφάνιση δορυφορικής εικόνας" },
  zoom_in: { en: "Zoom in", de: "Vergrößern", el: "Μεγέθυνση" },
  zoom_out: { en: "Zoom out", de: "Verkleinern", el: "Σμίκρυνση" },
  help: { en: "Help", de: "Hilfe", el: "Βοήθεια" },
  hint_drawing: { en: "Tap each corner of your field. Tap the first corner again to finish.", de: "Tippen Sie auf jede Ecke Ihres Feldes. Tippen Sie zum Abschluss wieder auf die erste Ecke.", el: "Πατήστε σε κάθε γωνία του χωραφιού σας. Πατήστε ξανά την πρώτη γωνία για να τελειώσετε." },
  hint_editing: { en: "Drag the corners to adjust the outline, then press the edit button again.", de: "Ziehen Sie die Ecken, um den Umriss anzupassen, und drücken Sie dann erneut auf Bearbeiten.", el: "Σύρετε τις γωνίες για να διορθώσετε το περίγραμμα και πατήστε ξανά το κουμπί επεξεργασίας." },
  hint_idle: { en: "Find your field, then press the draw button to outline it.", de: "Suchen Sie Ihr Feld und drücken Sie dann auf Zeichnen, um es einzuzeichnen.", el: "Βρείτε το χωράφι σας και πατήστε το κουμπί σχεδίασης για να το περιγράψετε." },
  search_ph: { en: "Search a place or coordinates", de: "Ort oder Koordinaten suchen", el: "Αναζήτηση τόπου ή συντεταγμένων" },
  search_label: { en: "Search a place, or type coordinates such as 50.92, 6.40", de: "Ort suchen oder Koordinaten eingeben, z. B. 50.92, 6.40", el: "Αναζητήστε τόπο ή γράψτε συντεταγμένες, π.χ. 50.92, 6.40" },
  go_coords: { en: "Go to these coordinates", de: "Zu diesen Koordinaten", el: "Μετάβαση σε αυτές τις συντεταγμένες" },
  no_results: { en: "No place found. Try another name, or type coordinates such as 50.92, 6.40.", de: "Kein Ort gefunden. Versuchen Sie einen anderen Namen oder Koordinaten wie 50.92, 6.40.", el: "Δεν βρέθηκε τόπος. Δοκιμάστε άλλο όνομα ή συντεταγμένες όπως 50.92, 6.40." },

  // ---- field panel
  your_field: { en: "Your field", de: "Ihr Feld", el: "Το χωράφι σας" },
  ha_outlined: { en: "{ha} hectares outlined", de: "{ha} Hektar eingezeichnet", el: "{ha} εκτάρια στο περίγραμμα" },
  draw_again: { en: "Draw again", de: "Neu zeichnen", el: "Σχεδίαση ξανά" },
  grow_q: { en: "What do you grow here, in order?", de: "Was bauen Sie hier an, in welcher Reihenfolge?", el: "Τι καλλιεργείτε εδώ, με ποια σειρά;" },
  grow_hint: { en: "Start with the crop you sow next and add the ones that follow, up to six.", de: "Beginnen Sie mit der nächsten Kultur und fügen Sie die folgenden hinzu, bis zu sechs.", el: "Ξεκινήστε με την καλλιέργεια που θα σπείρετε μετά και προσθέστε τις επόμενες, έως έξι." },
  crop_n: { en: "Crop {n}", de: "Kultur {n}", el: "Καλλιέργεια {n}" },
  choose_crop: { en: "Choose a crop", de: "Kultur wählen", el: "Επιλέξτε καλλιέργεια" },
  remove_crop: { en: "Remove crop {n}", de: "Kultur {n} entfernen", el: "Αφαίρεση καλλιέργειας {n}" },
  sown_in: { en: "Sown in", de: "Gesät im", el: "Σπορά" },
  harvested_in: { en: "Harvested in", de: "Geerntet im", el: "Συγκομιδή" },
  add_next: { en: "Add the next crop", de: "Nächste Kultur hinzufügen", el: "Προσθήκη επόμενης καλλιέργειας" },
  irrigate_q: { en: "Can you irrigate this field?", de: "Können Sie dieses Feld bewässern?", el: "Μπορείτε να ποτίσετε αυτό το χωράφι;" },
  yes: { en: "Yes", de: "Ja", el: "Ναι" },
  no: { en: "No", de: "Nein", el: "Όχι" },
  matters_q: { en: "What matters most to you?", de: "Was ist Ihnen am wichtigsten?", el: "Τι σας ενδιαφέρει περισσότερο;" },
  size_small: { en: "This outline is smaller than 1 hectare. Draw the whole field.", de: "Dieser Umriss ist kleiner als 1 Hektar. Zeichnen Sie das ganze Feld ein.", el: "Το περίγραμμα είναι μικρότερο από 1 εκτάριο. Σχεδιάστε όλο το χωράφι." },
  size_large: { en: "This outline is larger than 500 hectares. Draw a single field.", de: "Dieser Umriss ist größer als 500 Hektar. Zeichnen Sie ein einzelnes Feld ein.", el: "Το περίγραμμα είναι μεγαλύτερο από 500 εκτάρια. Σχεδιάστε ένα μόνο χωράφι." },
  need_crop: { en: "Choose a crop in every row.", de: "Wählen Sie in jeder Zeile eine Kultur.", el: "Επιλέξτε καλλιέργεια σε κάθε γραμμή." },
  need_irr: { en: "Tell us whether you can irrigate.", de: "Geben Sie an, ob Sie bewässern können.", el: "Πείτε μας αν μπορείτε να ποτίσετε." },
  need_prio: { en: "Choose what matters most to you.", de: "Wählen Sie, was Ihnen am wichtigsten ist.", el: "Επιλέξτε τι σας ενδιαφέρει περισσότερο." },
  analysing: { en: "Analysing your field…", de: "Ihr Feld wird analysiert…", el: "Ανάλυση του χωραφιού σας…" },
  analyse: { en: "Analyse my field", de: "Mein Feld analysieren", el: "Ανάλυση του χωραφιού μου" },
  p_save_water: { en: "Save water", de: "Wasser sparen", el: "Εξοικονόμηση νερού" },
  p_save_water_hint: { en: "Crops that need less water than they get now", de: "Kulturen, die weniger Wasser brauchen", el: "Καλλιέργειες που χρειάζονται λιγότερο νερό" },
  p_build_soil: { en: "Build healthier soil", de: "Gesünderer Boden", el: "Πιο υγιές έδαφος" },
  p_build_soil_hint: { en: "Keep the soil covered and add nitrogen", de: "Boden bedeckt halten und Stickstoff zuführen", el: "Έδαφος καλυμμένο και περισσότερο άζωτο" },
  p_income_forage: { en: "Earn more or feed animals", de: "Mehr Einkommen oder Futter", el: "Εισόδημα ή ζωοτροφή" },
  p_income_forage_hint: { en: "More months with a crop you can sell or graze", de: "Mehr Monate mit einer Kultur zum Verkaufen oder Beweiden", el: "Περισσότεροι μήνες με καλλιέργεια για πώληση ή βόσκηση" },


  // ---- field health
  health_h: { en: "Field health", de: "Feldgesundheit", el: "Υγεία του χωραφιού" },
  issues_q: { en: "Have there been pest or disease problems on this field?", de: "Gab es auf diesem Feld Probleme mit Schädlingen oder Krankheiten?", el: "Υπήρξαν προβλήματα με εχθρούς ή ασθένειες σε αυτό το χωράφι;" },
  issues_hint: { en: "Choose all that apply.", de: "Wählen Sie alles Zutreffende.", el: "Επιλέξτε όσα ισχύουν." },
  i_fungal: { en: "Fungal diseases", de: "Pilzkrankheiten", el: "Μυκητολογικές ασθένειες" },
  i_fungal_hint: { en: "rust, mildew, root rot, smut", de: "Rost, Mehltau, Fußkrankheiten, Brand", el: "σκωρίαση, ωίδιο, σήψεις, άνθρακας" },
  i_viral: { en: "Viral diseases", de: "Viruskrankheiten", el: "Ιώσεις" },
  i_viral_hint: { en: "yellow, stunted plants; mosaic leaves", de: "gelbe, gestauchte Pflanzen; Mosaikblätter", el: "κίτρινα, νανά φυτά· φύλλα με μωσαϊκό" },
  i_pests: { en: "Insect pests", de: "Schadinsekten", el: "Έντομα εχθροί" },
  i_pests_hint: { en: "aphids, beetles, wireworms, stink bugs", de: "Blattläuse, Käfer, Drahtwürmer, Wanzen", el: "αφίδες, σκαθάρια, σιδηροσκούληκα, βρωμούσες" },
  i_none: { en: "No problems", de: "Keine Probleme", el: "Κανένα πρόβλημα" },
  unsure: { en: "Not sure", de: "Weiß nicht", el: "Δεν ξέρω" },
  nutr_q: { en: "Fertiliser last season, or any shortage you noticed?", de: "Düngung in der letzten Saison oder bemerkter Mangel?", el: "Λίπανση την περσινή περίοδο ή έλλειψη που παρατηρήσατε;" },
  n_normal: { en: "Usual fertiliser, no shortage", de: "Übliche Düngung, kein Mangel", el: "Συνήθης λίπανση, καμία έλλειψη" },
  n_high: { en: "A lot of nitrogen", de: "Viel Stickstoff", el: "Πολύ άζωτο" },
  n_low_n: { en: "Nitrogen shortage (N)", de: "Stickstoffmangel (N)", el: "Έλλειψη αζώτου (N)" },
  n_low_p: { en: "Phosphorus shortage (P)", de: "Phosphormangel (P)", el: "Έλλειψη φωσφόρου (P)" },
  n_low_k: { en: "Potassium shortage (K)", de: "Kaliummangel (K)", el: "Έλλειψη καλίου (K)" },
  soil_opt: { en: "Your soil (optional)", de: "Ihr Boden (optional)", el: "Το έδαφός σας (προαιρετικό)" },
  soil_opt_hint: { en: "Helps with pest, disease and nutrient advice.", de: "Hilft bei Hinweisen zu Schädlingen, Krankheiten und Nährstoffen.", el: "Βοηθά στις συμβουλές για εχθρούς, ασθένειες και θρεπτικά." },
  texture_q: { en: "What is the soil like?", de: "Wie ist der Boden?", el: "Τι έδαφος είναι;" },
  t_sandy: { en: "Sandy", de: "Sandig", el: "Αμμώδες" },
  t_loamy: { en: "Loamy", de: "Lehmig", el: "Πηλώδες" },
  t_clay: { en: "Clay (heavy)", de: "Tonig (schwer)", el: "Αργιλώδες (βαρύ)" },
  look_q: { en: "What colour is the soil?", de: "Welche Farbe hat der Boden?", el: "Τι χρώμα έχει το έδαφος;" },
  l_red: { en: "Red", de: "Rot", el: "Κόκκινο" },
  l_red_hint: { en: "rich in iron", de: "eisenreich", el: "πλούσιο σε σίδηρο" },
  l_light: { en: "Light or whitish", de: "Hell oder weißlich", el: "Ανοιχτό ή υπόλευκο" },
  l_light_hint: { en: "may be chalky, high pH", de: "evtl. kalkreich, hoher pH", el: "ίσως ασβεστούχο, υψηλό pH" },
  l_dark: { en: "Very dark", de: "Sehr dunkel", el: "Πολύ σκούρο" },
  l_dark_hint: { en: "much organic matter, may be acidic", de: "viel Humus, evtl. sauer", el: "πολλή οργανική ουσία, ίσως όξινο" },
  ph_q: { en: "pH, if you know it", de: "pH-Wert, falls bekannt", el: "pH, αν το γνωρίζετε" },
  source_q: { en: "How do you know?", de: "Woher wissen Sie das?", el: "Πώς το ξέρετε;" },
  s_analysis: { en: "Soil analysis", de: "Bodenuntersuchung", el: "Ανάλυση εδάφους" },
  s_experience: { en: "What I see in the field", de: "Was ich auf dem Feld sehe", el: "Από όσα βλέπω στο χωράφι" },
  need_issues: { en: "Tell us about pests and diseases on this field.", de: "Machen Sie Angaben zu Schädlingen und Krankheiten auf diesem Feld.", el: "Πείτε μας για εχθρούς και ασθένειες στο χωράφι." },
  need_nutr: { en: "Tell us about last season's fertiliser.", de: "Machen Sie Angaben zur Düngung der letzten Saison.", el: "Πείτε μας για την περσινή λίπανση." },
  health_ask_h: { en: "Ask your advisor about this field", de: "Fragen an Ihre Beratung zu diesem Feld", el: "Ρωτήστε τον σύμβουλό σας για αυτό το χωράφι" },
  g_cereal: { en: "Cereal after cereal", de: "Getreide nach Getreide", el: "Σιτηρό μετά από σιτηρό" },
  g_cereal_val: { en: "{n} in {y} years", de: "{n} in {y} Jahren", el: "{n} σε {y} χρόνια" },
  g_cereal_none: { en: "never", de: "nie", el: "ποτέ" },

  // ---- results window
  analysis_title: { en: "Analysis of your field", de: "Analyse Ihres Feldes", el: "Ανάλυση του χωραφιού σας" },
  tab_field: { en: "Your field", de: "Ihr Feld", el: "Το χωράφι σας" },
  tab_options: { en: "Your options", de: "Ihre Optionen", el: "Οι επιλογές σας" },
  close_window: { en: "Close and go back to the map", de: "Schließen und zurück zur Karte", el: "Κλείσιμο και επιστροφή στον χάρτη" },
  compare: { en: "Compare rotations", de: "Fruchtfolgen vergleichen", el: "Σύγκριση αμειψισπορών" },
  back_field: { en: "Back to your field", de: "Zurück zu Ihrem Feld", el: "Πίσω στο χωράφι σας" },
  loading: { en: "Reading 40 years of weather for your field…", de: "40 Jahre Wetterdaten für Ihr Feld werden gelesen…", el: "Διαβάζουμε 40 χρόνια καιρού για το χωράφι σας…" },
  loading_sub: { en: "This takes a few seconds the first time.", de: "Das dauert beim ersten Mal ein paar Sekunden.", el: "Την πρώτη φορά χρειάζονται λίγα δευτερόλεπτα." },
  error_title: { en: "The analysis did not finish", de: "Die Analyse wurde nicht abgeschlossen", el: "Η ανάλυση δεν ολοκληρώθηκε" },
  error_hint: { en: "Close this window to adjust your field or crops, then try again.", de: "Schließen Sie dieses Fenster, passen Sie Feld oder Kulturen an und versuchen Sie es erneut.", el: "Κλείστε το παράθυρο, διορθώστε το χωράφι ή τις καλλιέργειες και δοκιμάστε ξανά." },
  weather_title: { en: "How the weather here has changed", de: "Wie sich das Wetter hier verändert hat", el: "Πώς άλλαξε ο καιρός εδώ" },
  water_h: { en: "Water", de: "Wasser", el: "Νερό" },
  bare_title: { en: "When your soil is bare", de: "Wann Ihr Boden kahl liegt", el: "Πότε το έδαφός σας μένει γυμνό" },
  heavy_note: { en: "Bare soil in heavy rain is where soil and nutrients are lost.", de: "Bei Starkregen auf kahlem Boden gehen Erde und Nährstoffe verloren.", el: "Όταν πέφτει έντονη βροχή σε γυμνό έδαφος, χάνονται χώμα και θρεπτικά στοιχεία." },
  space_h: { en: "Seen from space", de: "Aus dem All gesehen", el: "Από το διάστημα" },
  confirm_legend: { en: "Is the soil really bare after harvest?", de: "Liegt der Boden nach der Ernte wirklich kahl?", el: "Μένει πράγματι γυμνό το έδαφος μετά τη συγκομιδή;" },
  confirm_hint: { en: "We assumed nothing covers the soil between your crops. Tell us what you usually leave.", de: "Wir haben angenommen, dass zwischen Ihren Kulturen nichts den Boden bedeckt. Was lassen Sie meist stehen?", el: "Υποθέσαμε ότι τίποτα δεν καλύπτει το έδαφος ανάμεσα στις καλλιέργειες. Τι αφήνετε συνήθως;" },
  bare_soil: { en: "Bare soil", de: "Kahler Boden", el: "Γυμνό έδαφος" },
  stubble: { en: "Stubble left", de: "Stoppeln bleiben", el: "Αφήνω καλαμιά" },
  something_else: { en: "Something else", de: "Etwas anderes", el: "Κάτι άλλο" },
  updating: { en: "Updating with your answer…", de: "Wird mit Ihrer Antwort aktualisiert…", el: "Ενημέρωση με την απάντησή σας…" },
  sources_h: { en: "Where this comes from", de: "Woher das kommt", el: "Από πού προέρχονται" },
  matters_aria: { en: "What matters most to you", de: "Was Ihnen am wichtigsten ist", el: "Τι σας ενδιαφέρει περισσότερο" },
  shared_h: { en: "{n} warnings apply to every option", de: "{n} Warnungen gelten für jede Option", el: "{n} προειδοποιήσεις ισχύουν για κάθε επιλογή" },
  shared_h1: { en: "1 warning applies to every option", de: "1 Warnung gilt für jede Option", el: "1 προειδοποίηση ισχύει για κάθε επιλογή" },
  shared_hint: { en: "They come from the weather and the crops all three rotations share.", de: "Sie stammen aus dem Wetter und den Kulturen, die alle drei Fruchtfolgen gemeinsam haben.", el: "Προέρχονται από τον καιρό και τις καλλιέργειες που έχουν κοινές και οι τρεις αμειψισπορές." },
  best_match: { en: "Best match", de: "Beste Wahl", el: "Καλύτερη επιλογή" },
  grow_now: { en: "What you grow now", de: "Ihr jetziger Anbau", el: "Τι καλλιεργείτε τώρα" },
  better_h: { en: "What gets better", de: "Was besser wird", el: "Τι βελτιώνεται" },
  warnings_h: { en: "Watch out for", de: "Worauf achten", el: "Τι να προσέξετε" },
  advisor_h: { en: "Ask your advisor", de: "Fragen an Ihre Beratung", el: "Ρωτήστε τον σύμβουλό σας" },
  r_current: { en: "Current rotation", de: "Jetzige Fruchtfolge", el: "Τωρινή αμειψισπορά" },
  r_soil_building: { en: "Soil-building rotation", de: "Bodenaufbauende Fruchtfolge", el: "Αμειψισπορά για υγιές έδαφος" },
  r_water_saving: { en: "Water-saving rotation", de: "Wassersparende Fruchtfolge", el: "Αμειψισπορά εξοικονόμησης νερού" },
  g_cover: { en: "Soil covered", de: "Boden bedeckt", el: "Καλυμμένο έδαφος" },
  g_cover_val: { en: "{n} of 12 months", de: "{n} von 12 Monaten", el: "{n} από 12 μήνες" },
  g_rain: { en: "Rain on bare soil", de: "Regen auf kahlem Boden", el: "Βροχή σε γυμνό έδαφος" },
  g_water: { en: "Extra water needed", de: "Zusätzlicher Wasserbedarf", el: "Επιπλέον νερό" },
  g_water_val: { en: "{n} mm a year", de: "{n} mm pro Jahr", el: "{n} mm τον χρόνο" },
  g_earn: { en: "Months to sell or graze", de: "Monate zum Verkaufen oder Beweiden", el: "Μήνες για πώληση ή βόσκηση" },
  g_earn_val: { en: "{n} a year", de: "{n} pro Jahr", el: "{n} τον χρόνο" },
  g_better: { en: "better than now", de: "besser als jetzt", el: "καλύτερα από τώρα" },
  g_worse: { en: "worse than now", de: "schlechter als jetzt", el: "χειρότερα από τώρα" },
  g_same: { en: "same as now", de: "wie jetzt", el: "όπως τώρα" },
  at_glance: { en: "At a glance", de: "Auf einen Blick", el: "Με μια ματιά" },

  why_h: { en: "Why choose it", de: "Was dafür spricht", el: "Γιατί να την επιλέξετε" },
  show_more: { en: "Show {n} more", de: "{n} weitere zeigen", el: "Δείτε {n} ακόμη" },
  show_less: { en: "Show less", de: "Weniger zeigen", el: "Λιγότερα" },
  read_aloud: { en: "Read aloud", de: "Vorlesen", el: "Ανάγνωση" },
  stop_reading: { en: "Stop reading", de: "Vorlesen stoppen", el: "Διακοπή ανάγνωσης" },
  in_numbers: { en: "In numbers", de: "In Zahlen", el: "Σε αριθμούς" },
  month_by_month: { en: "Month by month", de: "Monat für Monat", el: "Μήνα με μήνα" },
  checking_field: { en: "Checking that the outline is on land…", de: "Es wird geprüft, ob der Umriss an Land liegt…", el: "Έλεγχος ότι το περίγραμμα είναι στη στεριά…" },
  // ---- my fields
  my_fields: { en: "My fields", de: "Meine Felder", el: "Τα χωράφια μου" },
  save_field: { en: "Save field", de: "Feld speichern", el: "Αποθήκευση χωραφιού" },
  saved_toast: { en: "Field saved on this device", de: "Feld auf diesem Gerät gespeichert", el: "Το χωράφι αποθηκεύτηκε σε αυτή τη συσκευή" },
  save_failed: { en: "This browser did not allow saving. Use Export to keep a copy.", de: "Dieser Browser erlaubt kein Speichern. Nutzen Sie Exportieren für eine Kopie.", el: "Αυτός ο φυλλομετρητής δεν επέτρεψε την αποθήκευση. Χρησιμοποιήστε την Εξαγωγή για αντίγραφο." },
  name_field: { en: "Name this field", de: "Feld benennen", el: "Δώστε όνομα στο χωράφι" },
  field_n: { en: "Field {n}", de: "Feld {n}", el: "Χωράφι {n}" },
  open: { en: "Open", de: "Öffnen", el: "Άνοιγμα" },
  rename: { en: "Rename", de: "Umbenennen", el: "Μετονομασία" },
  delete_field: { en: "Delete", de: "Löschen", el: "Διαγραφή" },
  confirm_delete: { en: "Delete “{name}”? This cannot be undone.", de: "„{name}“ löschen? Das lässt sich nicht rückgängig machen.", el: "Διαγραφή του «{name}»; Δεν μπορεί να αναιρεθεί." },
  cancel: { en: "Cancel", de: "Abbrechen", el: "Άκυρο" },
  save: { en: "Save", de: "Speichern", el: "Αποθήκευση" },
  close: { en: "Close", de: "Schließen", el: "Κλείσιμο" },
  no_fields: { en: "Fields you save appear here. Draw a field, fill in the form and press “Save field”.", de: "Hier erscheinen Ihre gespeicherten Felder. Zeichnen Sie ein Feld ein, füllen Sie das Formular aus und drücken Sie „Feld speichern“.", el: "Εδώ εμφανίζονται τα χωράφια που αποθηκεύετε. Σχεδιάστε ένα χωράφι, συμπληρώστε τη φόρμα και πατήστε «Αποθήκευση χωραφιού»." },
  device_note: { en: "Saved on this device only, with no account. Use Export to keep a copy or move your fields to another device.", de: "Nur auf diesem Gerät gespeichert, ohne Konto. Mit Exportieren behalten Sie eine Kopie oder übertragen Ihre Felder auf ein anderes Gerät.", el: "Αποθηκεύεται μόνο σε αυτή τη συσκευή, χωρίς λογαριασμό. Με την Εξαγωγή κρατάτε αντίγραφο ή μεταφέρετε τα χωράφια σας σε άλλη συσκευή." },
  export: { en: "Export", de: "Exportieren", el: "Εξαγωγή" },
  import: { en: "Import", de: "Importieren", el: "Εισαγωγή" },
  import_bad: { en: "This file is not a Spora fields file.", de: "Diese Datei ist keine Spora-Felddatei.", el: "Αυτό το αρχείο δεν είναι αρχείο χωραφιών του Spora." },
  saved_on: { en: "saved {date}", de: "gespeichert {date}", el: "αποθήκευση {date}" },
  with_results: { en: "with results", de: "mit Ergebnissen", el: "με αποτελέσματα" },
  t9_t: { en: "Save your fields", de: "Felder speichern", el: "Αποθηκεύστε τα χωράφια σας" },
  t9_d: { en: "Press “Save field” to keep the outline, your answers and the results. Open them again any time from “My fields”.", de: "Mit „Feld speichern“ behalten Sie Umriss, Angaben und Ergebnisse. Unter „Meine Felder“ öffnen Sie sie jederzeit wieder.", el: "Πατήστε «Αποθήκευση χωραφιού» για να κρατήσετε το περίγραμμα, τις απαντήσεις και τα αποτελέσματα. Ανοίξτε τα ξανά όποτε θέλετε από τα «Τα χωράφια μου»." },
  // ---- month strip
  year_n: { en: "Year {n}", de: "Jahr {n}", el: "Έτος {n}" },
  months: { en: "Months", de: "Monate", el: "Μήνες" },
  no_crop: { en: "no crop", de: "keine Kultur", el: "χωρίς καλλιέργεια" },
  soil_covered: { en: "soil covered", de: "Boden bedeckt", el: "έδαφος καλυμμένο" },
  soil_bare: { en: "soil bare", de: "Boden kahl", el: "έδαφος γυμνό" },
  crop_growing: { en: "Crop growing", de: "Kultur wächst", el: "Καλλιέργεια" },
  cover_crop: { en: "Cover crop", de: "Zwischenfrucht", el: "Καλλιέργεια κάλυψης" },
  seen_covered: { en: "covered", de: "bedeckt", el: "καλυμμένο" },
  seen_bare: { en: "bare", de: "kahl", el: "γυμνό" },
  seen_none: { en: "no clear image", de: "kein klares Bild", el: "χωρίς καθαρή εικόνα" },
  seen_differs: { en: "differs from your crop months", de: "weicht von Ihren Anbaumonaten ab", el: "διαφέρει από τους μήνες που δηλώσατε" },

  // ---- landing
  slogan_1: { en: "See your field from space.", de: "Sehen Sie Ihr Feld aus dem All.", el: "Δείτε το χωράφι σας από το διάστημα." },
  slogan_2: { en: "Plan your rotation on the ground.", de: "Planen Sie Ihre Fruchtfolge auf dem Boden.", el: "Σχεδιάστε την αμειψισπορά σας στο χωράφι." },
  hero_sub: { en: "Free NASA weather and satellite data, turned into plain-language advice on which crops to grow and when.", de: "Kostenlose Wetter- und Satellitendaten der NASA, übersetzt in klare Empfehlungen, was Sie wann anbauen.", el: "Δωρεάν δεδομένα καιρού και δορυφόρων της NASA, σε απλές συμβουλές για το τι να καλλιεργήσετε και πότε." },
  how_it_works: { en: "How it works", de: "So funktioniert es", el: "Πώς λειτουργεί" },
  credit: { en: "NASA Space Apps Challenge 2026, Aachen", de: "NASA Space Apps Challenge 2026, Aachen", el: "NASA Space Apps Challenge 2026, Άαχεν" },
  steps_title: { en: "From a drawn field to a clear decision in three steps", de: "Vom eingezeichneten Feld zur klaren Entscheidung in drei Schritten", el: "Από ένα σχεδιασμένο χωράφι σε μια σαφή απόφαση, σε τρία βήματα" },
  step1_t: { en: "Draw your field", de: "Feld einzeichnen", el: "Σχεδιάστε το χωράφι σας" },
  step1_d: { en: "Outline it on the satellite map and tell us which crops you grow, month by month.", de: "Umreißen Sie es auf der Satellitenkarte und sagen Sie uns, was Sie Monat für Monat anbauen.", el: "Σχεδιάστε το στον δορυφορικό χάρτη και πείτε μας τι καλλιεργείτε, μήνα με μήνα." },
  step2_t: { en: "We read NASA data", de: "Wir lesen NASA-Daten", el: "Διαβάζουμε δεδομένα της NASA" },
  step2_d: { en: "Forty years of weather, satellite greenness and slope for exactly that spot.", de: "Vierzig Jahre Wetter, Satellitengrün und Hangneigung für genau diese Stelle.", el: "Σαράντα χρόνια καιρού, δορυφορική βλάστηση και κλίση για ακριβώς αυτό το σημείο." },
  step3_t: { en: "Compare three rotations", de: "Drei Fruchtfolgen vergleichen", el: "Συγκρίνετε τρεις αμειψισπορές" },
  step3_d: { en: "What you grow now, a soil-building option and a water-saving option, in plain words.", de: "Ihr jetziger Anbau, eine bodenaufbauende und eine wassersparende Option, in klaren Worten.", el: "Τι καλλιεργείτε τώρα, μια επιλογή για υγιές έδαφος και μια για εξοικονόμηση νερού, με απλά λόγια." },
  start_here: { en: "Start here: draw your field", de: "Hier starten: Feld einzeichnen", el: "Ξεκινήστε εδώ: σχεδιάστε το χωράφι σας" },
  data_title: { en: "Built only on open NASA data", de: "Nur mit offenen NASA-Daten gebaut", el: "Βασισμένο μόνο σε ανοιχτά δεδομένα της NASA" },
  d1_t: { en: "NASA POWER", de: "NASA POWER", el: "NASA POWER" },
  d1_d: { en: "Daily rain, temperature, sun, wind and humidity since 1981, to see how your weather has changed.", de: "Täglich Regen, Temperatur, Sonne, Wind und Luftfeuchte seit 1981, um zu sehen, wie sich Ihr Wetter verändert hat.", el: "Καθημερινή βροχή, θερμοκρασία, ηλιοφάνεια, άνεμος και υγρασία από το 1981, για να δείτε πώς άλλαξε ο καιρός σας." },
  d2_t: { en: "HLS satellite imagery", de: "HLS-Satellitenbilder", el: "Δορυφορικές εικόνες HLS" },
  d2_d: { en: "Landsat and Sentinel-2 every few days at 30 m, to see when your soil really lies bare.", de: "Landsat und Sentinel-2 alle paar Tage mit 30 m Auflösung, um zu sehen, wann Ihr Boden wirklich kahl liegt.", el: "Landsat και Sentinel-2 κάθε λίγες μέρες στα 30 m, για να δείτε πότε το έδαφός σας μένει πραγματικά γυμνό." },
  d3_t: { en: "NASADEM elevation", de: "NASADEM-Höhendaten", el: "Υψόμετρο NASADEM" },
  d3_d: { en: "Slope of your field, to tell where heavy rain carries soil away.", de: "Die Hangneigung Ihres Feldes, um zu erkennen, wo Starkregen Boden abträgt.", el: "Η κλίση του χωραφιού σας, για να φανεί πού η έντονη βροχή παρασύρει χώμα." },
  open_source: { en: "Open {name} (opens a new tab)", de: "{name} öffnen (neuer Tab)", el: "Άνοιγμα {name} (νέα καρτέλα)" },
  data_note: { en: "Weather and soil-cover results work for any field. Crop suggestions are checked for North Rhine-Westphalia first; elsewhere, confirm them with a local advisor.", de: "Wetter- und Bodenbedeckungsergebnisse gelten für jedes Feld. Die Kulturvorschläge sind zuerst für Nordrhein-Westfalen geprüft; anderswo bestätigen Sie sie bitte mit einer Beratung vor Ort.", el: "Τα αποτελέσματα για τον καιρό και την κάλυψη του εδάφους ισχύουν για κάθε χωράφι. Οι προτάσεις καλλιεργειών έχουν ελεγχθεί πρώτα για τη Βόρεια Ρηνανία-Βεστφαλία· αλλού, επιβεβαιώστε τις με τοπικό σύμβουλο." },
  ready: { en: "Ready to look at your own field?", de: "Bereit, Ihr eigenes Feld anzusehen?", el: "Έτοιμοι να δείτε το δικό σας χωράφι;" },

  // ---- help tour
  tour_offer_t: { en: "First time here?", de: "Zum ersten Mal hier?", el: "Πρώτη φορά εδώ;" },
  tour_offer_d: { en: "A short guide shows you how to use Spora, step by step. It takes about one minute.", de: "Eine kurze Anleitung zeigt Ihnen Schritt für Schritt, wie Spora funktioniert. Das dauert etwa eine Minute.", el: "Ένας σύντομος οδηγός σάς δείχνει βήμα-βήμα πώς να χρησιμοποιήσετε το Spora. Διαρκεί περίπου ένα λεπτό." },
  tour_start: { en: "Show me how", de: "Zeig mir, wie", el: "Δείξτε μου πώς" },
  tour_skip: { en: "No thanks", de: "Nein, danke", el: "Όχι, ευχαριστώ" },
  tour_next: { en: "Next", de: "Weiter", el: "Επόμενο" },
  tour_back: { en: "Back", de: "Zurück", el: "Πίσω" },
  tour_done: { en: "Start", de: "Los geht's", el: "Ξεκινάμε" },
  tour_close: { en: "Close the guide", de: "Anleitung schließen", el: "Κλείσιμο οδηγού" },
  tour_step: { en: "Step {n} of {total}", de: "Schritt {n} von {total}", el: "Βήμα {n} από {total}" },
  tour_reopen: { en: "You can open this guide again at any time with the ? button.", de: "Sie können diese Anleitung jederzeit mit der ?-Taste wieder öffnen.", el: "Μπορείτε να ανοίξετε ξανά τον οδηγό οποιαδήποτε στιγμή με το κουμπί ?." },
  t1_t: { en: "Welcome to Spora", de: "Willkommen bei Spora", el: "Καλώς ήρθατε στο Spora" },
  t1_d: { en: "In a few steps you outline your field, tell us what you grow, and get advice on your crop rotation. You cannot break anything: every step can be undone.", de: "In wenigen Schritten zeichnen Sie Ihr Feld ein, sagen uns, was Sie anbauen, und erhalten Hinweise zu Ihrer Fruchtfolge. Sie können nichts kaputt machen: Jeder Schritt lässt sich rückgängig machen.", el: "Σε λίγα βήματα σχεδιάζετε το χωράφι σας, μας λέτε τι καλλιεργείτε και παίρνετε συμβουλές για την αμειψισπορά σας. Δεν μπορείτε να χαλάσετε τίποτα: κάθε βήμα αναιρείται." },
  t2_t: { en: "1. Find your field", de: "1. Feld finden", el: "1. Βρείτε το χωράφι σας" },
  t2_d: { en: "Type the name of your village here and pick it from the list. You can also type coordinates, for example 50.92, 6.40.", de: "Geben Sie hier den Namen Ihres Ortes ein und wählen Sie ihn aus der Liste. Sie können auch Koordinaten eingeben, zum Beispiel 50.92, 6.40.", el: "Γράψτε εδώ το όνομα του χωριού σας και επιλέξτε το από τη λίστα. Μπορείτε επίσης να γράψετε συντεταγμένες, για παράδειγμα 50.92, 6.40." },
  t3_t: { en: "2. Move the map", de: "2. Karte bewegen", el: "2. Μετακινήστε τον χάρτη" },
  t3_d: { en: "Drag the map with your finger or mouse. Pinch, or use + and −, to zoom in until you clearly see the edges of your field.", de: "Ziehen Sie die Karte mit dem Finger oder der Maus. Zoomen Sie mit zwei Fingern oder mit + und −, bis Sie die Ränder Ihres Feldes deutlich sehen.", el: "Σύρετε τον χάρτη με το δάχτυλο ή το ποντίκι. Μεγεθύνετε με δύο δάχτυλα ή με + και − μέχρι να βλέπετε καθαρά τα όρια του χωραφιού σας." },
  t4_t: { en: "3. Draw your field", de: "3. Feld einzeichnen", el: "3. Σχεδιάστε το χωράφι σας" },
  t4_d: { en: "Press this button. Then tap each corner of your field on the map, one after another. Tap the first corner again to finish.", de: "Drücken Sie diese Taste. Tippen Sie dann nacheinander auf jede Ecke Ihres Feldes. Tippen Sie zum Abschluss wieder auf die erste Ecke.", el: "Πατήστε αυτό το κουμπί. Μετά πατήστε μία-μία τις γωνίες του χωραφιού σας στον χάρτη. Πατήστε ξανά την πρώτη γωνία για να τελειώσετε." },
  t5_t: { en: "Made a mistake?", de: "Vertan?", el: "Κάνατε λάθος;" },
  t5_d: { en: "The pencil lets you move the corners. The bin removes the outline so you can start again.", de: "Mit dem Stift verschieben Sie die Ecken. Der Mülleimer löscht den Umriss, damit Sie neu beginnen können.", el: "Με το μολύβι μετακινείτε τις γωνίες. Ο κάδος σβήνει το περίγραμμα για να ξεκινήσετε από την αρχή." },
  t6_t: { en: "4. Tell us what you grow", de: "4. Sagen Sie uns, was Sie anbauen", el: "4. Πείτε μας τι καλλιεργείτε" },
  t6_d: { en: "After you draw the field, a form opens. Choose your crops in the order you grow them, with the month you sow and the month you harvest each one. Then tell us about past pests, diseases and fertiliser on this field.", de: "Nach dem Einzeichnen öffnet sich ein Formular. Wählen Sie Ihre Kulturen in der Reihenfolge des Anbaus, jeweils mit Saat- und Erntemonat. Dann machen Sie Angaben zu früheren Schädlingen, Krankheiten und zur Düngung.", el: "Μόλις σχεδιάσετε το χωράφι, ανοίγει μια φόρμα. Επιλέξτε τις καλλιέργειές σας με τη σειρά που τις καλλιεργείτε, με τον μήνα σποράς και συγκομιδής της καθεμιάς. Μετά πείτε μας για προηγούμενους εχθρούς, ασθένειες και τη λίπανση στο χωράφι." },
  t7_t: { en: "5. Get your results", de: "5. Ergebnisse erhalten", el: "5. Δείτε τα αποτελέσματα" },
  t7_d: { en: "Answer the two short questions and press “Analyse my field”. A window opens: first how the weather changed and when your soil is bare, then three rotations side by side. The best match for you is marked.", de: "Beantworten Sie die zwei kurzen Fragen und drücken Sie „Mein Feld analysieren“. Ein Fenster zeigt zuerst, wie sich das Wetter verändert hat und wann Ihr Boden kahl liegt, dann drei Fruchtfolgen nebeneinander. Die beste Wahl ist markiert.", el: "Απαντήστε στις δύο σύντομες ερωτήσεις και πατήστε «Ανάλυση του χωραφιού μου». Ένα παράθυρο δείχνει πρώτα πώς άλλαξε ο καιρός και πότε το έδαφός σας μένει γυμνό, και μετά τρεις αμειψισπορές δίπλα-δίπλα. Η καλύτερη επιλογή είναι σημειωμένη." },
  t8_t: { en: "Help and language", de: "Hilfe und Sprache", el: "Βοήθεια και γλώσσα" },
  t8_d: { en: "Press ? to see this guide again. Press the language button to switch between English, Deutsch and Ελληνικά.", de: "Drücken Sie ?, um diese Anleitung wieder zu sehen. Mit der Sprachtaste wechseln Sie zwischen English, Deutsch und Ελληνικά.", el: "Πατήστε ? για να δείτε ξανά αυτόν τον οδηγό. Με το κουμπί γλώσσας αλλάζετε ανάμεσα σε English, Deutsch και Ελληνικά." },
} satisfies Record<string, Entry>;

export type Key = keyof typeof S;

export const MONTHS: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  el: ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"],
};
export const MONTH_INITIALS: Record<Lang, string[]> = {
  en: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  de: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  el: ["Ι", "Φ", "Μ", "Α", "Μ", "Ι", "Ι", "Α", "Σ", "Ο", "Ν", "Δ"],
};

const STORE_KEY = "spora-lang";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === "en" || saved === "de" || saved === "el") return saved;
  } catch { /* storage blocked: fall through */ }
  const nav = (navigator.language || "en").slice(0, 2);
  return nav === "de" ? "de" : nav === "el" ? "el" : "en";
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  num: (n: number, digits?: number) => string;
}

const I18n = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORE_KEY, l); } catch { /* ignore */ }
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    t: (key, vars) => {
      let s = (S[key] as Entry)[lang] ?? (S[key] as Entry).en;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    num: (n, digits = 0) => new Intl.NumberFormat(lang, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n),
  }), [lang, setLang]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18n);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}

/** Three small buttons (EN · DE · ΕΛ) for places where the map's language menu is out of reach. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={t("language")}>
      {LANGS.map((l) => (
        <button key={l.id} type="button" lang={l.id} aria-pressed={lang === l.id} aria-label={l.name}
          className={lang === l.id ? "is-on" : ""} onClick={() => setLang(l.id)}>{l.short}</button>
      ))}
    </div>
  );
}

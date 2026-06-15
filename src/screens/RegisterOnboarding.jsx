import { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

const ROLES = [
  { id: 'developer', label: 'Developer', desc: 'Kod yazir, layihe qurur' },
  { id: 'designer', label: 'Designer', desc: 'UI/UX ve qrafik dizayn' },
  { id: 'devops', label: 'DevOps / SRE', desc: 'Infrastructure, CI/CD, cloud' },
  { id: 'hr', label: 'HR / Recruiter', desc: 'Istedad axtarir' },
  { id: 'manager', label: 'Product Manager', desc: 'Mehsulu idare edir' },
  { id: 'student', label: 'Telebe', desc: 'Oyrenir ve inkisaf edir' },
  { id: 'founder', label: 'Founder / CTO', desc: 'Sirket ve komanda qurur' },
  { id: 'data', label: 'Data / ML Eng.', desc: 'Data, analiz ve ML' },
];

const SUB_ROLES = {
  developer: ['Frontend', 'Backend', 'Full Stack', 'Mobile', 'Embedded / IoT', 'Game Dev'],
  designer: ['UX Designer', 'UI Designer', 'Product Designer', 'Motion Designer', 'Brand Designer'],
  devops: ['Cloud Engineer', 'SRE', 'Security Eng.', 'CI/CD Specialist'],
  hr: ['Recruiter', 'HRBP', 'Talent Manager'],
  manager: ['Product Manager', 'Scrum Master', 'Engineering Director'],
  student: ['Computer Science', 'Bootcamp', 'Self-taught'],
  founder: ['CTO', 'CEO / Co-founder', 'Indie Hacker'],
  data: ['Data Analyst', 'Data Engineer', 'Data Scientist', 'ML Engineer'],
};

const TECH_STACKS = {
  developer: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'Python', 'Go', 'Docker', 'React Native'],
  designer: ['Figma', 'Adobe XD', 'Framer', 'Illustrator', 'Motion'],
  devops: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'Jenkins'],
  data: ['Python', 'SQL', 'Spark', 'TensorFlow', 'PyTorch', 'dbt'],
  default: ['Git', 'Figma', 'Jira', 'Slack', 'Notion'],
};

const LANGUAGES = ['Azerbaycanca', 'English', 'Turkce', 'Rusca'];

export default function RegisterOnboardingScreen() {
  const { completeOnboarding, signOut, user } = useContext(AuthContext);
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedSubRole, setSelectedSubRole] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    bio: '',
    website: '',
  });
  const [loading, setLoading] = useState(false);

  const availableSkills = TECH_STACKS[selectedRole] || TECH_STACKS.default;
  const subRoles = selectedRole ? SUB_ROLES[selectedRole] || [] : [];

  const toggleValue = (value, setter) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const handleContinue = () => {
    if (step === 0 && !selectedRole) {
      Alert.alert('Xeta', 'Rolu secin');
      return;
    }
    if (step === 1 && subRoles.length > 0 && !selectedSubRole) {
      Alert.alert('Xeta', 'Alt rolu secin');
      return;
    }
    if (step === 2 && selectedSkills.length === 0) {
      Alert.alert('Xeta', 'En azi bir texnologiya secin');
      return;
    }
    setStep((current) => Math.min(current + 1, 3));
  };

  const handleComplete = async () => {
    if (!profileData.name.trim() || !profileData.bio.trim()) {
      Alert.alert('Xeta', 'Ad ve bio sahesini doldurun');
      return;
    }

    setLoading(true);
    try {
      await completeOnboarding({
        role: selectedRole,
        subRole: selectedSubRole,
        skills: selectedSkills,
        languages: selectedLanguages,
        name: profileData.name.trim(),
        bio: profileData.bio.trim(),
        website: profileData.website.trim(),
      });
    } catch (error) {
      Alert.alert('Xeta', error.response?.data?.message || error.message || 'Profil tamamlanmadi');
    } finally {
      setLoading(false);
    }
  };

  const renderRoleStep = () => (
    <>
      <Text style={styles.title}>Rolunu sec</Text>
      <Text style={styles.subtitle}>Feed ve profil bu melumatlara gore qurulacaq.</Text>
      <View style={styles.grid}>
        {ROLES.map((role) => {
          const active = selectedRole === role.id;
          return (
            <TouchableOpacity
              key={role.id}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => {
                setSelectedRole(role.id);
                setSelectedSubRole(null);
              }}
            >
              <Text style={styles.cardTitle}>{role.label}</Text>
              <Text style={styles.cardDesc}>{role.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderSubRoleStep = () => (
    <>
      <Text style={styles.title}>Daha deqiq sec</Text>
      <Text style={styles.subtitle}>Saheni sec, sonra texnologiyalara keceyik.</Text>
      <View style={styles.list}>
        {subRoles.map((subRole) => {
          const active = selectedSubRole === subRole;
          return (
            <TouchableOpacity
              key={subRole}
              style={[styles.rowCard, active && styles.cardActive]}
              onPress={() => setSelectedSubRole(subRole)}
            >
              <Text style={styles.cardTitle}>{subRole}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderSkillsStep = () => (
    <>
      <Text style={styles.title}>Stack ve diller</Text>
      <Text style={styles.subtitle}>En azi bir texnologiya sec.</Text>
      <Text style={styles.sectionTitle}>Texnologiyalar</Text>
      <View style={styles.chipWrap}>
        {availableSkills.map((skill) => {
          const active = selectedSkills.includes(skill);
          return (
            <TouchableOpacity
              key={skill}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleValue(skill, setSelectedSkills)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{skill}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.sectionTitle}>Diller</Text>
      <View style={styles.chipWrap}>
        {LANGUAGES.map((language) => {
          const active = selectedLanguages.includes(language);
          return (
            <TouchableOpacity
              key={language}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleValue(language, setSelectedLanguages)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{language}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderProfileStep = () => (
    <>
      <Text style={styles.title}>Profili tamamla</Text>
      <Text style={styles.subtitle}>Ad, bio ve isteye bagli sayt melumati.</Text>
      <TextInput
        style={styles.input}
        value={profileData.name}
        onChangeText={(name) => setProfileData((prev) => ({ ...prev, name }))}
        placeholder="Ad Soyad"
        placeholderTextColor="#64748b"
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        value={profileData.bio}
        onChangeText={(bio) => setProfileData((prev) => ({ ...prev, bio }))}
        placeholder="Ozun haqqinda qisa melumat"
        placeholderTextColor="#64748b"
        multiline
        numberOfLines={4}
      />
      <TextInput
        style={styles.input}
        value={profileData.website}
        onChangeText={(website) => setProfileData((prev) => ({ ...prev, website }))}
        placeholder="https://example.com"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
      />
    </>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressRow}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={[styles.progressDot, item <= step && styles.progressDotActive]} />
          ))}
        </View>

        {step === 0 && renderRoleStep()}
        {step === 1 && renderSubRoleStep()}
        {step === 2 && renderSkillsStep()}
        {step === 3 && renderProfileStep()}
      </ScrollView>

      <View style={styles.footer}>
        {step === 0 ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={signOut}>
            <Text style={styles.secondaryButtonText}>Cixis</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep((current) => current - 1)}>
            <Text style={styles.secondaryButtonText}>Geri</Text>
          </TouchableOpacity>
        )}

        {step < 3 ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>Davam et</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleComplete} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Tamamla</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 28,
    marginTop: 16,
  },
  progressDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1e293b',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#7c3aed',
  },
  title: {
    color: '#e2e8f0',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  list: {
    marginTop: 2,
  },
  card: {
    width: '48%',
    backgroundColor: '#0b1120',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderColor: '#1e293b',
    borderWidth: 1,
    minHeight: 112,
  },
  rowCard: {
    backgroundColor: '#0b1120',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderColor: '#1e293b',
    borderWidth: 1,
  },
  cardActive: {
    backgroundColor: '#1f1445',
    borderColor: '#7c3aed',
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#0b1120',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  chipText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#0b1120',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#020617',
    borderTopColor: '#111827',
    borderTopWidth: 1,
  },
  secondaryButton: {
    flex: 1,
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
  },
  secondaryButtonText: {
    color: '#cbd5e1',
    fontWeight: '700',
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
});

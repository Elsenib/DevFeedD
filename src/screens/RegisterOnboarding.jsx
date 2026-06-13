import { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

// Roller və sub-roller DevFeed.jsx-dən
const ROLES = [
  { id: 'developer', label: 'Developer', icon: '💻', desc: 'Kod yazır, layihə qurur' },
  { id: 'designer', label: 'Designer', icon: '🎨', desc: 'UI/UX, qrafik dizayn' },
  { id: 'devops', label: 'DevOps / SRE', icon: '🔐', desc: 'İnfrastruktur, CI/CD' },
  { id: 'hr', label: 'HR / Recruiter', icon: '🎯', desc: 'İstedad axtarır' },
  { id: 'manager', label: 'Product Manager', icon: '📊', desc: 'Məhsulu idarə edir' },
  { id: 'student', label: 'Tələbə', icon: '📚', desc: 'Öyrənir, inkişaf edir' },
  { id: 'founder', label: 'Founder / CTO', icon: '🚀', desc: 'Şirkət qurur' },
  { id: 'data', label: 'Data / ML Eng.', icon: '🤖', desc: 'Data analiz, ML modellər' },
];

const SUB_ROLES = {
  developer: [
    { id: 'frontend', label: 'Frontend', icon: '🖥️' },
    { id: 'backend', label: 'Backend', icon: '⚙️' },
    { id: 'fullstack', label: 'Full Stack', icon: '🔄' },
    { id: 'mobile', label: 'Mobile', icon: '📱' },
    { id: 'embedded', label: 'Embedded / IoT', icon: '🔌' },
    { id: 'game', label: 'Game Dev', icon: '🎮' },
  ],
  designer: [
    { id: 'ux', label: 'UX Designer', icon: '🔬' },
    { id: 'ui', label: 'UI Designer', icon: '🎨' },
    { id: 'product', label: 'Product Designer', icon: '✏️' },
    { id: 'motion', label: 'Motion Designer', icon: '🎬' },
    { id: 'brand', label: 'Brand Designer', icon: '💎' },
  ],
  devops: [
    { id: 'cloud', label: 'Cloud Engineer', icon: '☁️' },
    { id: 'sre', label: 'SRE', icon: '📊' },
    { id: 'security', label: 'Security Eng.', icon: '🔐' },
    { id: 'cicd', label: 'CI/CD Specialist', icon: '🔁' },
  ],
  data: [
    { id: 'analyst', label: 'Data Analyst', icon: '📈' },
    { id: 'engineer', label: 'Data Engineer', icon: '🏗️' },
    { id: 'scientist', label: 'Data Scientist', icon: '🧪' },
    { id: 'ml', label: 'ML Engineer', icon: '🤖' },
  ],
  hr: [
    { id: 'recruiter', label: 'Recruiter', icon: '🎯' },
    { id: 'hrbp', label: 'HR Business Partner', icon: '🤝' },
    { id: 'talent', label: 'Talent Manager', icon: '⭐' },
  ],
  manager: [
    { id: 'pm', label: 'Product Manager', icon: '📋' },
    { id: 'scrum', label: 'Scrum Master', icon: '🔄' },
    { id: 'director', label: 'Engineering Director', icon: '🏢' },
  ],
  student: [
    { id: 'cs', label: 'Kompüter Elmləri', icon: '💻' },
    { id: 'bootcamp', label: 'Bootcamp', icon: '🚀' },
    { id: 'selftaught', label: 'Self-taught', icon: '📚' },
  ],
  founder: [
    { id: 'cto', label: 'CTO', icon: '⚡' },
    { id: 'ceo', label: 'CEO/Co-founder', icon: '🏆' },
    { id: 'indie', label: 'Indie Hacker', icon: '🛠️' },
  ],
};

const TECH_STACKS = {
  frontend: ['React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'Tailwind', 'Svelte'],
  backend: ['Node.js', 'Python', 'Go', 'Java', 'Rust', 'PHP', 'Ruby', 'C#'],
  fullstack: ['React + Node', 'Next.js', 'Nuxt', 'Django', 'Laravel', 'Rails'],
  mobile: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Expo', 'Ionic'],
  cloud: ['AWS', 'GCP', 'Azure', 'DigitalOcean', 'Heroku'],
  devops: ['Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitLab CI'],
  data: ['Python', 'SQL', 'Spark', 'TensorFlow', 'PyTorch'],
  default: ['Git', 'Figma', 'Jira', 'Slack', 'Notion'],
};

export default function RegisterOnboardingScreen({ navigation }) {
  const { completeOnboarding, signOut } = useContext(AuthContext);
  
  // Onboarding state
  const [step, setStep] = useState(0); // 0: role, 1: subRole, 2: skills, 3: profile
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedSubRole, setSelectedSubRole] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    website: '',
  });
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setSelectedSubRole(null);
    setStep(1);
  };

  const handleSubRoleSelect = (subRoleId) => {
    setSelectedSubRole(subRoleId);
    setStep(2);
  };

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const toggleLanguage = (lang) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleContinue = () => {
    if (step === 1) {
      if (!selectedSubRole) {
        Alert.alert('Xəta', 'Xahiş edirəm alt rolu seçin');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedSkills.length === 0) {
        Alert.alert('Xəta', 'Ən azı bir texnologiya seçin');
        return;
      }
      setStep(3);
    }
  };

  const handleBackStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Xəta', 'Çıxış edə bilmədi');
    }
  };

  const handleCompleteProfile = async () => {
    if (!profileData.name || !profileData.bio) {
      Alert.alert('Xəta', 'Ad və bio-nu doldurun');
      return;
    }

    setLoading(true);
    try {
      const onboardingData = {
        role: selectedRole,
        subRole: selectedSubRole,
        skills: selectedSkills,
        languages: selectedLanguages,
        name: profileData.name,
        bio: profileData.bio,
        website: profileData.website,
      };

      await completeOnboarding(onboardingData);
      // Navigation handled by AuthContext
    } catch (error) {
      Alert.alert('Xəta', error.message || 'Profil tamamlanamadı');
    } finally {
      setLoading(false);
    }
  };

  // Step 0: Role Selection
  if (step === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Rolunuzu seçin</Text>
          <Text style={styles.subtitle}>Hansı rolda işləyirsiniz?</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={styles.roleCard}
                onPress={() => handleRoleSelect(role.id)}
              >
                <Text style={styles.roleIcon}>{role.icon}</Text>
                <Text style={styles.roleLabel}>{role.label}</Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 1: Sub-role Selection
  if (step === 1 && selectedRole) {
    const subRolesForRole = SUB_ROLES[selectedRole] || [];
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ustalaşdığınız alan</Text>
          <Text style={styles.subtitle}>
            Əlavə bir seçim edin: {ROLES.find((r) => r.id === selectedRole)?.label}
          </Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {subRolesForRole.map((subRole) => (
              <TouchableOpacity
                key={subRole.id}
                style={styles.roleCard}
                onPress={() => handleSubRoleSelect(subRole.id)}
              >
                <Text style={styles.roleIcon}>{subRole.icon}</Text>
                <Text style={styles.roleLabel}>{subRole.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackStep}>
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 2: Skills & Languages
  if (step === 2) {
    const availableSkills = TECH_STACKS[selectedSubRole] || TECH_STACKS.default;
    const languages = ['Azərbaycanca', 'İngilis', 'Rus', 'Türkçə', 'Almanca'];

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Texnologiyalar</Text>
          <Text style={styles.subtitle}>Hansı texnologiyalarla işləyirsiniz?</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Texnologiyalar (Ən azı 1)</Text>
            <View style={styles.tagGrid}>
              {availableSkills.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.tag,
                    selectedSkills.includes(skill) && styles.tagSelected,
                  ]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selectedSkills.includes(skill) && styles.tagTextSelected,
                    ]}
                  >
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dillər (isteğe bağlı)</Text>
            <View style={styles.tagGrid}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.tag,
                    selectedLanguages.includes(lang) && styles.tagSelected,
                  ]}
                  onPress={() => toggleLanguage(lang)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selectedLanguages.includes(lang) && styles.tagTextSelected,
                    ]}
                  >
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackStep}>
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            disabled={selectedSkills.length === 0}
          >
            <Text style={styles.continueButtonText}>Davam et →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 3: Profile Completion
  if (step === 3) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profilunuzu tamamlayın</Text>
          <Text style={styles.subtitle}>Daha çox detallar əlavə edin</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.label}>Ad (Tələb olunur)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Adınız"
                placeholderTextColor="#64748b"
                value={profileData.name}
                onChangeText={(text) =>
                  setProfileData((prev) => ({ ...prev, name: text }))
                }
              />
            </View>

            <Text style={styles.label}>Bio (Tələb olunur)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Haqqınızda qısa məlumat (meslek, ixtisaslaşma)"
                placeholderTextColor="#64748b"
                value={profileData.bio}
                onChangeText={(text) =>
                  setProfileData((prev) => ({ ...prev, bio: text }))
                }
                multiline
                numberOfLines={3}
              />
            </View>

            <Text style={styles.label}>Web saytı (isteğe bağlı)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="https://example.com"
                placeholderTextColor="#64748b"
                value={profileData.website}
                onChangeText={(text) =>
                  setProfileData((prev) => ({ ...prev, website: text }))
                }
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seçim xülasəsi</Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryItem}>
                <Text style={{ fontWeight: 'bold' }}>Rol:</Text> {ROLES.find((r) => r.id === selectedRole)?.label}
              </Text>
              <Text style={styles.summaryItem}>
                <Text style={{ fontWeight: 'bold' }}>Sahə:</Text>{' '}
                {SUB_ROLES[selectedRole]?.find((s) => s.id === selectedSubRole)?.label}
              </Text>
              <Text style={styles.summaryItem}>
                <Text style={{ fontWeight: 'bold' }}>Texnologiyalar:</Text> {selectedSkills.join(', ')}
              </Text>
              {selectedLanguages.length > 0 && (
                <Text style={styles.summaryItem}>
                  <Text style={{ fontWeight: 'bold' }}>Dillər:</Text> {selectedLanguages.join(', ')}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackStep}>
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.completeButtonText}>Profilı tamamla ✓</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const TextInput = ({ style, ...props }) => {
  const [focused, setFocused] = React.useState(false);
  const React = require('react');
  
  return (
    <TextInput
      {...props}
      style={[
        style,
        focused && { borderColor: '#7c3aed', borderWidth: 2 },
      ]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};

// TextInput component for React Native
import { TextInput as RNTextInput } from 'react-native';
const TextInput_Component = (props) => (
  <RNTextInput
    {...props}
    placeholderTextColor="#64748b"
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  roleCard: {
    width: '48%',
    backgroundColor: '#0b1120',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderColor: '#1e293b',
    borderWidth: 1,
    alignItems: 'center',
  },
  roleIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 6,
  },
  roleDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  tagGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0b1120',
    borderRadius: 8,
    borderColor: '#1e293b',
    borderWidth: 1,
  },
  tagSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  tagText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#ffffff',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#0b1120',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e2e8f0',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  summaryBox: {
    backgroundColor: '#0b1120',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 8,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  backButton: {
    flex: 0.45,
    paddingVertical: 14,
    borderRadius: 10,
    borderColor: '#1e293b',
    borderWidth: 1,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
  },
  continueButton: {
    flex: 0.45,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

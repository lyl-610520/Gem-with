import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaPalette, FaMoon, FaSun, FaStar, FaSave } from 'react-icons/fa';
import { ChromePicker } from 'react-color';
import axios from 'axios';

const SettingsContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text};
  margin-bottom: 30px;
`;

const SettingsSection = styled.div`
  background: ${props => props.theme.cardBg};
  backdrop-filter: blur(10px);
  border-radius: ${props => props.theme.borderRadius};
  padding: 30px;
  margin-bottom: 20px;
  box-shadow: ${props => props.theme.shadow};
  border: 1px solid ${props => props.theme.border};
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ThemeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const ThemeCard = styled(motion.div)`
  background: ${props => props.theme.cardBg};
  border: 2px solid ${props => props.selected ? props.theme.primary : props.theme.border};
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
`;

const ThemePreview = styled.div`
  height: 100px;
  border-radius: 8px;
  margin-bottom: 15px;
  background: ${props => props.background};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
`;

const ThemeName = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${props => props.theme.text};
  margin-bottom: 5px;
`;

const ThemeDescription = styled.div`
  font-size: 0.9rem;
  color: ${props => props.theme.textLight};
`;

const ColorPickerSection = styled.div`
  margin-top: 20px;
`;

const ColorPickerLabel = styled.label`
  display: block;
  font-weight: 500;
  color: ${props => props.theme.text};
  margin-bottom: 10px;
`;

const ColorPickerButton = styled.button`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 3px solid ${props => props.theme.border};
  background: ${props => props.color};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }
`;

const ColorPickerContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const ColorPickerPopover = styled.div`
  position: absolute;
  top: 70px;
  left: 0;
  z-index: 1000;
`;

const ColorPickerCover = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;

const SaveButton = styled(motion.button)`
  background: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 15px 30px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
  }
`;

const themes = [
  {
    id: 'pure',
    name: '纯色简约',
    description: '简洁优雅，支持自定义颜色',
    icon: <FaPalette />,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    id: 'cute',
    name: '可爱华丽',
    description: '温馨可爱，充满活力',
    icon: <FaSun />,
    background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)'
  },
  {
    id: 'dreamy',
    name: '星月梦幻',
    description: '神秘梦幻，如星空般美丽',
    icon: <FaMoon />,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
  }
];

function Settings({ user, theme, customColor, onThemeChange }) {
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [selectedColor, setSelectedColor] = useState(customColor);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId);
  };

  const handleColorChange = (color) => {
    setSelectedColor(color.hex);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put('/user/profile', {
        theme: selectedTheme,
        custom_color: selectedColor
      });
      onThemeChange(selectedTheme, selectedColor);
      alert('设置保存成功！');
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存设置失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsContainer>
      <Title>⚙️ 设置</Title>

      <SettingsSection>
        <SectionTitle>
          <FaPalette />
          主题设置
        </SectionTitle>
        
        <ThemeGrid>
          {themes.map((themeOption) => (
            <ThemeCard
              key={themeOption.id}
              selected={selectedTheme === themeOption.id}
              onClick={() => handleThemeSelect(themeOption.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ThemePreview background={themeOption.background}>
                {themeOption.icon}
              </ThemePreview>
              <ThemeName>{themeOption.name}</ThemeName>
              <ThemeDescription>{themeOption.description}</ThemeDescription>
            </ThemeCard>
          ))}
        </ThemeGrid>

        {selectedTheme === 'pure' && (
          <ColorPickerSection>
            <ColorPickerLabel>自定义主色调</ColorPickerLabel>
            <ColorPickerContainer>
              <ColorPickerButton
                color={selectedColor}
                onClick={() => setShowColorPicker(!showColorPicker)}
              />
              {showColorPicker && (
                <>
                  <ColorPickerPopover>
                    <ChromePicker
                      color={selectedColor}
                      onChange={handleColorChange}
                    />
                  </ColorPickerPopover>
                  <ColorPickerCover onClick={() => setShowColorPicker(false)} />
                </>
              )}
            </ColorPickerContainer>
          </ColorPickerSection>
        )}
      </SettingsSection>

      <SettingsSection>
        <SectionTitle>
          <FaStar />
          其他设置
        </SectionTitle>
        
        <div style={{ color: '#6b7280', fontSize: '0.95rem' }}>
          更多设置功能正在开发中...
        </div>
      </SettingsSection>

      <SaveButton
        onClick={handleSave}
        disabled={saving}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FaSave />
        {saving ? '保存中...' : '保存设置'}
      </SaveButton>
    </SettingsContainer>
  );
}

export default Settings;
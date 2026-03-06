import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { PROVIDER_REGISTRY } from '@personal-cli/shared';

interface Props {
  onComplete: () => void;
  onAddProvider: (id: string) => void;
  configuredProviders: string[];
}

type Step = 'welcome' | 'providers' | 'features' | 'finished';

export function OnboardingWizard({ onComplete, onAddProvider, configuredProviders }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedProviderIdx, setSelectedProviderIdx] = useState(0);

  const steps: Step[] = ['welcome', 'providers', 'features', 'finished'];
  const currentStepIdx = steps.indexOf(step);

  useInput((input, key) => {
    if (key.return) {
      if (step === 'welcome') setStep('providers');
      else if (step === 'providers') {
        if (configuredProviders.length > 0) setStep('features');
        else {
          const provider = PROVIDER_REGISTRY[selectedProviderIdx];
          if (provider) onAddProvider(provider.id);
        }
      } else if (step === 'features') setStep('finished');
      else if (step === 'finished') onComplete();
      return;
    }

    if (key.escape) {
      onComplete();
      return;
    }

    if (step === 'providers') {
      if (key.upArrow) {
        setSelectedProviderIdx((i) => (i > 0 ? i - 1 : PROVIDER_REGISTRY.length - 1));
      }
      if (key.downArrow) {
        setSelectedProviderIdx((i) => (i < PROVIDER_REGISTRY.length - 1 ? i + 1 : 0));
      }
      if (key.rightArrow && configuredProviders.length > 0) {
        setStep('features');
      }
    }
    
    if (key.rightArrow && step !== 'providers' && step !== 'finished') {
       const nextIdx = currentStepIdx + 1;
       if (nextIdx < steps.length) setStep(steps[nextIdx]);
    }
    if (key.leftArrow) {
       const prevIdx = currentStepIdx - 1;
       if (prevIdx >= 0) setStep(steps[prevIdx]);
    }
  });

  const renderWelcome = () => (
    <Box flexDirection="column">
      <Text color="#00E5FF" bold>WELCOME_TO_PERSONAL_CLI v0.1.0</Text>
      <Box marginTop={1}>
        <Text color="white">
          You are now connected to a high-performance, AI-driven terminal workspace.
          This tool is designed to assist with codebase analysis, refactoring, and automated tasks.
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="#8C959F">Press [ENTER] to begin configuration sequence.</Text>
      </Box>
    </Box>
  );

  const renderProviders = () => (
    <Box flexDirection="column">
      <Text color="#00E5FF" bold>STEP_01: LINKING_NEURAL_PROVIDERS</Text>
      <Box marginBottom={1}>
        <Text color="#8C959F">To function, I need an API key from at least one LLM provider.</Text>
      </Box>
      
      <Box flexDirection="column" borderStyle="round" borderColor="#484F58" paddingX={1}>
        {PROVIDER_REGISTRY.map((p, i) => {
          const isSelected = i === selectedProviderIdx;
          const isConfigured = configuredProviders.includes(p.id);
          return (
            <Box key={p.id}>
              <Text color={isSelected ? '#FF00AA' : '#484F58'}>{isSelected ? '❯ ' : '  '}</Text>
              <Box width={20}>
                <Text color={isConfigured ? '#3FB950' : isSelected ? 'white' : '#8C959F'} bold={isConfigured}>
                  {p.label.toUpperCase()}
                </Text>
              </Box>
              <Text color="#484F58">{isConfigured ? '[LINKED]' : '[UNLINKED]'}</Text>
            </Box>
          );
        })}
      </Box>
      
      <Box marginTop={1}>
        <Text color="#8C959F">
          {configuredProviders.length > 0 
            ? 'At least one provider linked. Press [ENTER] to add another or [→] to continue.' 
            : 'Select a provider and press [ENTER] to add your API key.'}
        </Text>
      </Box>
    </Box>
  );

  const renderFeatures = () => (
    <Box flexDirection="column">
      <Text color="#00E5FF" bold>STEP_02: OPERATIONAL_OVERVIEW</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text color="white">  ⚡ [COMMANDS]   Type / to access tools like /model, /mode, /history.</Text>
        <Text color="white">  📁 [FILES]      Drop files or type @path to attach them to context.</Text>
        <Text color="white">  🔄 [WORKFLOWS]  Cycle modes (ask/plan/build) with [TAB] for different behaviors.</Text>
        <Text color="white">  ⌨ [HOTKEYS]    Press [?] anytime to see the neural interface keymap.</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="#8C959F">Press [ENTER] to finalize initialization.</Text>
      </Box>
    </Box>
  );

  const renderFinished = () => (
    <Box flexDirection="column" alignItems="center">
      <Text color="#3FB950" bold>SYSTEM_READY</Text>
      <Box marginTop={1} borderStyle="double" borderColor="#3FB950" paddingX={3} paddingY={1}>
        <Text color="white" bold>► INITIALIZATION COMPLETE ◄</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="#8C959F">You can now start interacting with the agent.</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="#FF00AA" bold>PRESS [ENTER] TO ENTER THE VOID</Text>
      </Box>
    </Box>
  );

  return (
    <Box 
      flexDirection="column" 
      paddingX={2} 
      paddingY={1} 
      borderStyle="single" 
      borderColor="#00E5FF"
      width={70}
      alignSelf="center"
    >
      <Box position="absolute" marginTop={-1} marginLeft={2} backgroundColor="black" paddingX={1}>
        <Text color="#00E5FF" bold> ONBOARDING_SEQUENCE </Text>
      </Box>

      {step === 'welcome' && renderWelcome()}
      {step === 'providers' && renderProviders()}
      {step === 'features' && renderFeatures()}
      {step === 'finished' && renderFinished()}

      <Box marginTop={1} justifyContent="space-between">
        <Box>
          {steps.map((s, i) => (
            <Text key={s} color={i === currentStepIdx ? '#00E5FF' : '#484F58'}>
              {i > 0 ? '─' : ''}●
            </Text>
          ))}
        </Box>
        <Text color="#484F58"> ESC:SKIP_ONBOARDING </Text>
      </Box>
    </Box>
  );
}

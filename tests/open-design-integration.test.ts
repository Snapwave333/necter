import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const openDesignSkillPath = path.resolve(process.cwd(), '.claude/skills/open-design');

describe('Open Design integration', () => {
  it('bundles Open Design as a built-in skill with source attribution', () => {
    const skillMd = fs.readFileSync(path.join(openDesignSkillPath, 'SKILL.md'), 'utf8');

    expect(skillMd).toContain('name: open-design');
    expect(skillMd).toContain('https://github.com/nexu-io/open-design');
    expect(skillMd).toContain('26502ea1246c61114fd2038af9036adb4b80fca2');
    expect(fs.existsSync(path.join(openDesignSkillPath, 'LICENSE.Apache-2.0'))).toBe(true);
  });

  it('includes local design-system references for sandboxed agent runs', () => {
    expect(fs.existsSync(path.join(openDesignSkillPath, 'design-systems'))).toBe(true);
    expect(
      fs.existsSync(path.join(openDesignSkillPath, 'design-systems/application/DESIGN.md'))
    ).toBe(true);
    expect(fs.existsSync(path.join(openDesignSkillPath, 'references/design-systems.md'))).toBe(
      true
    );
    expect(fs.existsSync(path.join(openDesignSkillPath, 'references/skills-protocol.md'))).toBe(
      true
    );
  });
});

import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';

// Valid invite codes - imported from environment
const VALID_CODES = [
  'NYMUZW', '7P3KUC', '73Y8JR', 'HKSYCE', '3H78XJ',
  'G7J9KU', 'ATHSWH', '9JPVEM', 'AWUOXR', 'IPXN6M',
  'AYUZO4', '93E7L9', 'IBT35G', '5FYOFF', '4988CJ',
  'NP354G', 'H0V7BN', 'MDDY0K', 'L1Y81R', '38U0FF',
  'KYDFQ3', 'TJ6A3J', 'A07A5L', 'PYDK0N', 'G3AZ6B',
  'TLRUD4', '1VE3YC', '21LCRE', 'EPYS8M', 'C111LZ',
  'H9BNF6', 'L1MIBD', 'ZAQ4PW', '8RYPDA', 'AUZIDJ',
  'A8NVKI', '1BTTMW', 'E5U91V', 'R234UQ', 'OEKWHC',
  'CDMSMO', 'E0FHT3', 'FV196R', 'VKWUC9', 'Q7GAPP',
  'FUXGEJ', 'ZIRVB2', 'P9U5ZC', '8LDMCA', '6Q2TNP',
  'MWO3RZ', '727GFF', 'M3HZZA', 'OPECLG', '69Y2GP',
  'MA7TGF', 'AQ4ZOF', 'AT941S', 'G1SEH7', 'US4K9S',
  'HPD3SE', '2R3QB3', 'VSO5WL', 'OOJKCK', '732NEK',
  'QEYQS2', 'AJ2XXZ', 'HRX15W', '282IPU', 'GNFLPU',
  '4TT19M', 'UCRA5A', 'WD3F06', '5MACNS', 'DUXJKX',
  'IBNUXG', 'X8SK36', '9NF4B7', '0Y5U9B', 'IZXK2Q',
  'N6MB1D', '7B0TYO', '2G8DQ1', 'LT5TZZ', 'ZE8GD6',
  'QPH61N', 'QSDG59', 'XEJKVX', 'FK2Q48', 'SJ7KZP',
  'ZOTM1Y', 'WS3NME', 'C7GRYC', '5A4WRB', '83ZKPT',
  'U6GTG5', 'HYOEBP', 'AZ5NKZ', 'CGZPUQ', 'NCPSFV'
];

class InviteCodeService {
  private usedCodesCollection = collection(db, 'usedInviteCodes');

  /**
   * Validate an invite code
   * @param code The invite code to validate
   * @returns Object with isValid and message
   */
  async validateCode(code: string): Promise<{ isValid: boolean; message: string }> {
    try {
      // Normalize the code (uppercase, trim)
      const normalizedCode = code.trim().toUpperCase();
      
      // Check if code format is valid (6 characters, alphanumeric)
      if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
        return {
          isValid: false,
          message: '인증 코드는 6자리 영문 대문자와 숫자 조합이어야 합니다.'
        };
      }
      
      // Check if code exists in valid codes list
      if (!VALID_CODES.includes(normalizedCode)) {
        return {
          isValid: false,
          message: '유효하지 않은 인증 코드입니다.'
        };
      }
      
      // Check if code has already been used
      const codeDoc = await getDoc(doc(this.usedCodesCollection, normalizedCode));
      if (codeDoc.exists()) {
        return {
          isValid: false,
          message: '이미 사용된 인증 코드입니다.'
        };
      }
      
      return {
        isValid: true,
        message: '유효한 인증 코드입니다.'
      };
    } catch (error) {
      console.error('Error validating invite code:', error);
      return {
        isValid: false,
        message: '인증 코드 확인 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * Mark a code as used
   * @param code The invite code to mark as used
   * @param userId The ID of the user who used the code
   * @param workspaceId The ID of the workspace created with this code
   */
  async markCodeAsUsed(code: string, userId: string, workspaceId: string): Promise<void> {
    try {
      const normalizedCode = code.trim().toUpperCase();
      
      await setDoc(doc(this.usedCodesCollection, normalizedCode), {
        code: normalizedCode,
        usedBy: userId,
        workspaceId,
        usedAt: new Date()
      });
    } catch (error) {
      console.error('Error marking code as used:', error);
      throw new Error('Failed to mark invite code as used');
    }
  }

  /**
   * Get usage statistics for invite codes
   */
  async getCodeStats(): Promise<{
    totalCodes: number;
    usedCodes: number;
    remainingCodes: number;
    usagePercentage: number;
  }> {
    try {
      const usedCodesSnapshot = await getDocs(this.usedCodesCollection);
      const usedCount = usedCodesSnapshot.size;
      const totalCount = VALID_CODES.length;
      const remainingCount = totalCount - usedCount;
      const usagePercentage = (usedCount / totalCount) * 100;
      
      return {
        totalCodes: totalCount,
        usedCodes: usedCount,
        remainingCodes: remainingCount,
        usagePercentage: Math.round(usagePercentage)
      };
    } catch (error) {
      console.error('Error getting code stats:', error);
      return {
        totalCodes: VALID_CODES.length,
        usedCodes: 0,
        remainingCodes: VALID_CODES.length,
        usagePercentage: 0
      };
    }
  }

  /**
   * Check if a specific code has been used
   */
  async isCodeUsed(code: string): Promise<boolean> {
    try {
      const normalizedCode = code.trim().toUpperCase();
      const codeDoc = await getDoc(doc(this.usedCodesCollection, normalizedCode));
      return codeDoc.exists();
    } catch (error) {
      console.error('Error checking code usage:', error);
      return false;
    }
  }
}

export default new InviteCodeService();
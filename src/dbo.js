

let dS = class dataStorage {
    
    constructor (){
      const Database = require('better-sqlite3');
      let db = new Database(':memory:');
      const creationList = ['create table if not exists questions (exam int, id int, question_num int, correct int, UNIQUE(exam, id, question_num) ON CONFLICT REPLACE);',
                            'create table if not exists assessment (question_num int, exam1 int, exam2 int, distractors real, generated int DEFAULT 0, UNIQUE(question_num) ON CONFLICT REPLACE);',
                            'create table if not exists student_list (id int, generated int DEFAULT 0, UNIQUE(id) ON CONFLICT REPLACE);'
                            ]; 
      
      creationList.forEach(function (value) {
        db.prepare(value).run();
      });
      this.db = db;
    }
    insertExamRecord (exam, id, question_num, correct){
      return this.db.prepare('INSERT INTO questions (exam, id, question_num, correct) VALUES(?,?,?,?)').run([exam, id, question_num, correct]);
    }
    insertAssessmentRecord (exam1, exam2, question_num, distractors){
      return this.db.prepare('INSERT INTO assessment(exam1, exam2, question_num, distractors) VALUES(?,?,?,?)').run([exam1, exam2, question_num, distractors]);
    }
    insertStudents (id){
      return this.db.prepare('INSERT INTO student_list(id) VALUES(?)').run([id]);
    }
    deleteExams (exam = 0){
      return exam === 0 ? this.db.prepare('DELETE FROM questions').run() : this.db.prepare('DELETE FROM questions WHERE exam=?').run([exam]);
    }
    deleteAssessment (){
      return this.db.prepare('DELETE FROM assessment').run();
    }
    deleteStudents (){
      return this.db.prepare('DELETE FROM student_list').run();
    }
    buildAssessment (){
      this.db.prepare('DELETE FROM assessment WHERE generated=1').run();
      const testRows = this.db.prepare('SELECT exam1 FROM assessment LIMIT 1').all();
      if (testRows.length < 1){
        const rows = this.db.prepare(`SELECT DISTINCT pre.question_num AS num FROM questions AS pre
                        JOIN questions AS post ON pre.question_num=post.question_num 
                        AND pre.id=post.id AND post.exam=2 WHERE pre.exam=1 ORDER BY pre.question_num ASC`).all();
        for(let value of rows){
          this.db.prepare('INSERT INTO assessment(exam1, exam2, question_num, distractors, generated) VALUES(?,?,?,?,1)').run([value.num, value.num, value.num, 4]);
        }
      }
    }
    buildStudents (){
      this.db.prepare('DELETE FROM student_list WHERE generated=1').run();
      const testRows = this.db.prepare('SELECT id FROM student_list LIMIT 1').all();
      if (testRows.length < 1){
        const rows = this.db.prepare(`SELECT pre.id AS id FROM
                                    (SELECT DISTINCT id FROM questions WHERE exam=1) AS pre
                                    JOIN
                                    (SELECT DISTINCT id FROM questions WHERE exam=2) AS post
                                    ON pre.id=post.id
                                    ORDER BY pre.id ASC`).all();
        for(let value of rows){
          this.db.prepare('INSERT INTO student_list(id,generated) VALUES(?,1)').run([value.id]);
        }
      }
    }
    buildMatched (group = false) {
      const select = group ? 'mytable.id AS id, COUNT(mytable.q) AS c' : 'mytable.q AS Q';
      const groupby = group ? 'mytable.id, mytable.Options' : 'mytable.q, mytable.Options';
      return this.db.prepare(`SELECT ${select},
                                  mytable.Options AS Options, 
                                  AVG(mytable.PL) AS PL,
                                  AVG(mytable.RL) AS RL,
                                  AVG(mytable.ZL) AS ZL,
                                  AVG(mytable.NL) AS NL
                                  FROM (
                                  SELECT pretest.id AS id, pretest.qn AS q, 
                                  CASE WHEN pretest.s=0 THEN posttest.s ELSE 0 END AS PL,
                                  CASE WHEN pretest.s=1 THEN posttest.s ELSE 0 END AS RL,
                                  CASE WHEN (pretest.s=0 AND posttest.s=0) THEN 1 ELSE 0 END AS ZL,
                                  CASE WHEN (pretest.s=1 AND posttest.s=0) THEN 1 ELSE 0 END AS NL,
                                  pretest.Options AS Options
                                  FROM (
                                    SELECT questions.id AS id, assessment.question_num AS qn, correct As s,
                                    assessment.distractors AS Options 
                                    FROM questions
                                    JOIN student_list ON student_list.id=questions.id
                                    JOIN assessment ON questions.question_num=assessment.exam1
                                    WHERE questions.exam=1
                                    ) AS pretest
                                  JOIN (
                                    SELECT questions.id AS id, assessment.question_num AS qn, correct As s
                                    FROM questions
                                    JOIN student_list ON student_list.id=questions.id
                                    JOIN assessment ON questions.question_num=assessment.exam2 WHERE questions.exam=2
                                    ) AS posttest 
                                  ON pretest.id=posttest.id AND pretest.qn=posttest.qn
                                  ) AS mytable GROUP BY ${groupby} ORDER BY ${groupby}
      `).all();
    }
    buildExamUnmatched (){
      return this.db.prepare(`SELECT firstResult.question_num AS q, firstResult.s AS Exam1, finalResult.s AS Exam2,
                              firstResult.distractors AS d FROM (
                                SELECT assessment.question_num, assessment.distractors,
                                AVG(correct) As s 
                                FROM questions
                                JOIN student_list ON student_list.id=questions.id
                                JOIN assessment ON questions.question_num=assessment.exam1
                                WHERE questions.exam=1 GROUP BY questions.question_num
                              ) AS firstResult 
                              JOIN (
                                SELECT assessment.question_num, AVG(correct) AS s 
                                FROM questions JOIN student_list ON student_list.id=questions.id
                                JOIN assessment ON questions.question_num=assessment.exam2
                                WHERE questions.exam=2 GROUP BY questions.question_num
                              ) AS finalResult
                              ON firstResult.question_num=finalResult.question_num ORDER BY firstResult.question_num ASC
      `).all()
    }
    buildStudentUnmatched (){
      return this.db.prepare(`SELECT firstResult.id AS id, firstResult.s AS Exam1, finalResult.s AS Exam2
                            FROM (
                              SELECT questions.id AS id, AVG(correct) AS s 
                              FROM questions JOIN student_list ON student_list.id=questions.id 
                              JOIN assessment ON questions.question_num=assessment.exam1 
                              WHERE questions.exam=1 GROUP BY questions.id
                            ) AS firstResult 
                            JOIN (
                              SELECT questions.id AS id, AVG(correct) AS s 
                              FROM questions
                              JOIN student_list ON student_list.id=questions.id
                              JOIN assessment ON questions.question_num=assessment.exam2
                              WHERE questions.exam=2 GROUP BY questions.id
                            ) AS finalResult
                            ON firstResult.id=finalResult.id ORDER BY finalResult.s DESC
      `).all();
    }
    getNumberOfMatchedStudents (){
      const count = this.db.prepare(`SELECT COUNT(pre.id) AS c FROM
                      (SELECT DISTINCT id FROM questions WHERE exam=1) AS pre
                      JOIN
                      (SELECT DISTINCT id FROM questions WHERE exam=2) AS post
                      ON pre.id=post.id
                      JOIN student_list ON student_list.id=pre.id
                      `).get();
      return count.c;
    }
    getExamScore (exam = 0){
      const score  = this.db.prepare('SELECT AVG(correct) AS score, COUNT(DISTINCT id) AS c FROM questions WHERE exam = ?').get(exam)
      return {
        score: score.score, 
        count: score.c
      };
    }
    
}
module.exports = dS;